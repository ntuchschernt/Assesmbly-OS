import "server-only";
import type { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";

type Ctx = { workspaceId: string; user: { id: string; name: string } };

export async function logActivity(
  ctx: Ctx,
  entry: { entityType: string; entityId: string; action: string; summary: string; link?: string },
) {
  await db.activity.create({ data: { workspaceId: ctx.workspaceId, actorId: ctx.user.id, ...entry } });
}

/** Creates a notification unless the recipient is the acting user. */
export async function notify(
  ctx: Ctx,
  recipientId: string | null | undefined,
  n: { type: NotificationType; title: string; body?: string; link?: string },
) {
  if (!recipientId || recipientId === ctx.user.id) return;
  await db.notification.create({ data: { workspaceId: ctx.workspaceId, userId: recipientId, ...n } });
}

/** Notifies all users with one of the given roles (e.g. approvers). */
export async function notifyRoles(
  ctx: Ctx,
  roles: Array<"ADMIN" | "PROJECT_MANAGER" | "ENGINEER" | "TECHNICIAN" | "QUALITY">,
  n: { type: NotificationType; title: string; body?: string; link?: string },
) {
  const users = await db.user.findMany({ where: { role: { in: roles } }, select: { id: true } });
  await Promise.all(users.map((u) => notify(ctx, u.id, n)));
}
