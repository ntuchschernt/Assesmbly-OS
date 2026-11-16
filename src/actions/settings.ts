"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireContext } from "@/lib/auth/context";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { WORKSPACE_COOKIE, sessionCookieOptions } from "@/lib/auth/jwt";
import { failure, safe, zodFailure, type ActionResult } from "@/lib/action-result";
import { optionalText, requiredText } from "@/lib/validation/common";

const profileSchema = z.object({ name: requiredText("Name", 80), title: optionalText(80) });
const passwordSchema = z
  .object({ current: z.string().min(1, "Aktuelles Passwort erforderlich"), next: z.string().min(8, "Mindestens 8 Zeichen"), confirm: z.string() })
  .refine((v) => v.next === v.confirm, { message: "Passwörter stimmen nicht überein", path: ["confirm"] });
const workspaceSchema = z.object({ name: requiredText("Name", 100), description: optionalText(300) });

export async function updateProfile(input: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const p = profileSchema.safeParse(input);
    if (!p.success) return zodFailure(p.error);
    await db.user.update({ where: { id: ctx.user.id }, data: p.data });
    revalidatePath("/", "layout");
    return { ok: true, message: "Profil gespeichert" };
  });
}

export async function changePassword(input: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const p = passwordSchema.safeParse(input);
    if (!p.success) return zodFailure(p.error);
    const user = await db.user.findUniqueOrThrow({ where: { id: ctx.user.id } });
    if (!(await verifyPassword(p.data.current, user.passwordHash))) return { ok: false, error: "Aktuelles Passwort ist falsch.", fieldErrors: { current: "Falsches Passwort" } };
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(p.data.next) } });
    return { ok: true, message: "Passwort geändert" };
  });
}

export async function updateWorkspace(input: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    if (ctx.user.role !== "ADMIN" && ctx.user.role !== "PROJECT_MANAGER") return failure("Nur Administratoren und Projektleitung dürfen den Workspace ändern.");
    const p = workspaceSchema.safeParse(input);
    if (!p.success) return zodFailure(p.error);
    await db.workspace.update({ where: { id: ctx.workspaceId }, data: p.data });
    revalidatePath("/", "layout");
    return { ok: true, message: "Workspace gespeichert" };
  });
}

export async function createWorkspace(input: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    if (ctx.user.role !== "ADMIN" && ctx.user.role !== "PROJECT_MANAGER") return failure("Keine Berechtigung, Workspaces anzulegen.");
    const p = workspaceSchema.safeParse(input);
    if (!p.success) return zodFailure(p.error);
    const base = p.data.name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "workspace";
    let slug = base;
    for (let i = 2; await db.workspace.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    const ws = await db.workspace.create({ data: { ...p.data, slug } });
    (await cookies()).set(WORKSPACE_COOKIE, ws.id, { ...sessionCookieOptions, maxAge: 60 * 60 * 24 * 365 });
    revalidatePath("/", "layout");
    return { ok: true, message: `Workspace „${ws.name}“ angelegt und aktiviert` };
  });
}
