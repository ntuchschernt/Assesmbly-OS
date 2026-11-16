import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE, WORKSPACE_COOKIE, verifySession } from "./jwt";
import { APPROVER_ROLES } from "@/lib/constants";

export type AppContext = Awaited<ReturnType<typeof loadContext>>;

async function loadContext() {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.sub },
    select: { id: true, name: true, email: true, role: true, title: true },
  });
  if (!user) return null;
  const workspaces = await db.workspace.findMany({ orderBy: { createdAt: "asc" } });
  const preferred = store.get(WORKSPACE_COOKIE)?.value;
  const workspace = workspaces.find((w) => w.id === preferred) ?? workspaces[0];
  if (!workspace) return null;
  return {
    user,
    workspace,
    workspaces,
    workspaceId: workspace.id,
    canApprove: APPROVER_ROLES.includes(user.role),
  };
}

/** Request-scoped context. Returns null when unauthenticated. */
export const getContext = cache(loadContext);

/** Use in pages/actions that require a logged-in user. */
export async function requireContext() {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  return ctx;
}
