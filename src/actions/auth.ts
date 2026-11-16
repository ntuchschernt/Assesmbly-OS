"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { SESSION_COOKIE, WORKSPACE_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { requireContext } from "@/lib/auth/context";
import type { ActionResult } from "@/lib/action-result";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Bitte eine gültige E-Mail-Adresse eingeben."),
  password: z.string().min(1, "Bitte Passwort eingeben."),
});

export async function login(_: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Same message for unknown user and wrong password (no user enumeration).
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { ok: false, error: "E-Mail oder Passwort ist falsch." };
  }
  const token = await signSession({ sub: user.id, name: user.name, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);

  const next = String(formData.get("next") ?? "/");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function switchWorkspace(workspaceId: string): Promise<ActionResult> {
  const ctx = await requireContext();
  if (!ctx.workspaces.some((w) => w.id === workspaceId)) return { ok: false, error: "Workspace nicht gefunden." };
  (await cookies()).set(WORKSPACE_COOKIE, workspaceId, { ...sessionCookieOptions, maxAge: 60 * 60 * 24 * 365 });
  redirect("/");
}
