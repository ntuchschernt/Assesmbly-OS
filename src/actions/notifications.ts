"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireContext } from "@/lib/auth/context";
import type { ActionResult } from "@/lib/action-result";

export async function markNotificationRead(id: string): Promise<ActionResult> {
  const ctx = await requireContext();
  await db.notification.updateMany({ where: { id, userId: ctx.user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const ctx = await requireContext();
  const { count } = await db.notification.updateMany({
    where: { userId: ctx.user.id, workspaceId: ctx.workspaceId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
  return { ok: true, message: `${count} Benachrichtigung(en) als gelesen markiert.` };
}
