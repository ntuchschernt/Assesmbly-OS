"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireContext } from "@/lib/auth/context";
import { commentSchema, moveTaskSchema, taskSchema } from "@/lib/validation/schemas";
import { failure, safe, zodFailure, type ActionResult } from "@/lib/action-result";
import { logActivity, notify } from "@/lib/services/activity";
import { positionBetween } from "@/lib/services/tasks";
import { storeUpload } from "@/lib/storage/upload";
import { getStorage } from "@/lib/storage";
import { TASK_STATUS } from "@/lib/constants";

async function assertLinks(workspaceId: string, d: { projectId: string | null; assemblyId: string | null; workOrderId: string | null; assigneeId?: string | null }) {
  if (d.projectId && !(await db.project.findFirst({ where: { id: d.projectId, workspaceId } }))) return "Projekt ungültig";
  if (d.assemblyId && !(await db.assembly.findFirst({ where: { id: d.assemblyId, machine: { project: { workspaceId } } } }))) return "Baugruppe ungültig";
  if (d.workOrderId && !(await db.workOrder.findFirst({ where: { id: d.workOrderId, assembly: { machine: { project: { workspaceId } } } } }))) return "Montageauftrag ungültig";
  return null;
}

export async function saveTask(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = taskSchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const data = parsed.data;
    const linkError = await assertLinks(ctx.workspaceId, data);
    if (linkError) return failure(linkError);

    if (id) {
      const existing = await db.task.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
      if (!existing) return failure("Aufgabe nicht gefunden.");
      await db.task.update({
        where: { id },
        data: { ...data, completedAt: data.status === "DONE" ? (existing.completedAt ?? new Date()) : null },
      });
      if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
        await notify(ctx, data.assigneeId, { type: "TASK_ASSIGNED", title: `Neue Aufgabe zugewiesen: TSK-${existing.number}`, body: data.title, link: `/tasks/${id}` });
      }
      if (existing.status !== data.status) {
        await logActivity(ctx, { entityType: "task", entityId: id, action: "status", summary: `hat TSK-${existing.number} nach ${TASK_STATUS[data.status].label} verschoben`, link: `/tasks/${id}` });
      }
      revalidatePath("/", "layout");
      return { ok: true, data: { id }, message: "Aufgabe gespeichert" };
    }

    const task = await db.$transaction(async (tx) => {
      const last = await tx.task.findFirst({ where: { workspaceId: ctx.workspaceId }, orderBy: { number: "desc" }, select: { number: true } });
      const lastPos = await tx.task.findFirst({ where: { workspaceId: ctx.workspaceId, status: data.status }, orderBy: { position: "desc" }, select: { position: true } });
      return tx.task.create({
        data: {
          ...data,
          workspaceId: ctx.workspaceId,
          number: (last?.number ?? 0) + 1,
          position: positionBetween(lastPos?.position ?? null, null),
          reporterId: ctx.user.id,
          completedAt: data.status === "DONE" ? new Date() : null,
        },
      });
    });
    await notify(ctx, data.assigneeId, { type: "TASK_ASSIGNED", title: `Neue Aufgabe zugewiesen: TSK-${task.number}`, body: task.title, link: `/tasks/${task.id}` });
    await logActivity(ctx, { entityType: "task", entityId: task.id, action: "created", summary: `hat TSK-${task.number} „${task.title}“ erstellt`, link: `/tasks/${task.id}` });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: task.id }, message: `TSK-${task.number} erstellt` };
  });
}

export async function deleteTask(id: string): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const task = await db.task.findFirst({ where: { id, workspaceId: ctx.workspaceId }, include: { attachments: true } });
    if (!task) return failure("Aufgabe nicht gefunden.");
    await db.task.delete({ where: { id } });
    await Promise.all(task.attachments.map((a) => getStorage().delete(a.storageKey).catch(() => undefined)));
    await logActivity(ctx, { entityType: "task", entityId: id, action: "deleted", summary: `hat TSK-${task.number} „${task.title}“ gelöscht` });
    revalidatePath("/", "layout");
    return { ok: true, message: `TSK-${task.number} gelöscht` };
  });
}

/** Kanban drag & drop: change status and/or order. */
export async function moveTask(input: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = moveTaskSchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const { id, status, beforeId } = parsed.data;
    const task = await db.task.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!task) return failure("Aufgabe nicht gefunden.");

    let next: number | null = null;
    let prev: number | null = null;
    if (beforeId) {
      const before = await db.task.findFirst({ where: { id: beforeId, workspaceId: ctx.workspaceId } });
      if (before) {
        next = before.position;
        const p = await db.task.findFirst({ where: { workspaceId: ctx.workspaceId, status, position: { lt: before.position }, NOT: { id } }, orderBy: { position: "desc" } });
        prev = p?.position ?? null;
      }
    } else {
      const last = await db.task.findFirst({ where: { workspaceId: ctx.workspaceId, status, NOT: { id } }, orderBy: { position: "desc" } });
      prev = last?.position ?? null;
    }
    await db.task.update({
      where: { id },
      data: {
        status,
        position: positionBetween(prev, next),
        completedAt: status === "DONE" ? (task.completedAt ?? new Date()) : null,
      },
    });
    if (task.status !== status) {
      await logActivity(ctx, { entityType: "task", entityId: id, action: "status", summary: `hat TSK-${task.number} nach ${TASK_STATUS[status].label} verschoben`, link: `/tasks/${id}` });
    }
    revalidatePath("/tasks");
    revalidatePath("/");
    return { ok: true, message: task.status !== status ? `TSK-${task.number} → ${TASK_STATUS[status].label}` : undefined };
  });
}

export async function addComment(input: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = commentSchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const task = await db.task.findFirst({ where: { id: parsed.data.taskId, workspaceId: ctx.workspaceId } });
    if (!task) return failure("Aufgabe nicht gefunden.");
    await db.taskComment.create({ data: { taskId: task.id, authorId: ctx.user.id, body: parsed.data.body } });
    const recipients = new Set([task.assigneeId, task.reporterId].filter((x): x is string => !!x));
    for (const r of recipients) {
      await notify(ctx, r, { type: "COMMENT", title: `Neuer Kommentar von ${ctx.user.name}`, body: parsed.data.body.slice(0, 140), link: `/tasks/${task.id}` });
    }
    revalidatePath(`/tasks/${task.id}`);
    return { ok: true, message: "Kommentar hinzugefügt" };
  });
}

export async function uploadAttachment(formData: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const taskId = String(formData.get("taskId") ?? "");
    const task = await db.task.findFirst({ where: { id: taskId, workspaceId: ctx.workspaceId } });
    if (!task) return failure("Aufgabe nicht gefunden.");
    const stored = await storeUpload(formData.get("file"), `tasks/${task.id}`);
    await db.attachment.create({ data: { taskId: task.id, fileName: stored.fileName, mimeType: stored.mimeType, size: stored.size, storageKey: stored.storageKey, uploadedById: ctx.user.id } });
    revalidatePath(`/tasks/${task.id}`);
    return { ok: true, message: `${stored.fileName} hochgeladen` };
  });
}

export async function deleteAttachment(id: string): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const att = await db.attachment.findFirst({ where: { id, task: { workspaceId: ctx.workspaceId } } });
    if (!att) return failure("Anhang nicht gefunden.");
    await db.attachment.delete({ where: { id } });
    await getStorage().delete(att.storageKey).catch(() => undefined);
    revalidatePath(`/tasks/${att.taskId}`);
    return { ok: true, message: "Anhang entfernt" };
  });
}
