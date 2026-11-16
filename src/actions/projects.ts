"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireContext } from "@/lib/auth/context";
import { projectSchema } from "@/lib/validation/schemas";
import { safe, zodFailure, failure, type ActionResult } from "@/lib/action-result";
import { logActivity, notify } from "@/lib/services/activity";
import { PROJECT_STATUS } from "@/lib/constants";

export async function saveProject(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = projectSchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const data = parsed.data;

    const clash = await db.project.findFirst({ where: { workspaceId: ctx.workspaceId, key: data.key, NOT: id ? { id } : undefined } });
    if (clash) return { ok: false, error: "Projektkürzel bereits vergeben.", fieldErrors: { key: "Kürzel bereits vergeben" } };

    if (id) {
      const existing = await db.project.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
      if (!existing) return failure("Projekt nicht gefunden.");
      await db.project.update({ where: { id }, data });
      if (existing.status !== data.status) {
        await logActivity(ctx, { entityType: "project", entityId: id, action: "status", summary: `hat ${data.key} auf „${PROJECT_STATUS[data.status].label}“ gesetzt`, link: `/projects/${id}` });
      }
      if (data.ownerId && data.ownerId !== existing.ownerId) {
        await notify(ctx, data.ownerId, { type: "TASK_ASSIGNED", title: `Projektverantwortung: ${data.name}`, link: `/projects/${id}` });
      }
      revalidatePath("/", "layout");
      return { ok: true, data: { id }, message: "Projekt aktualisiert" };
    }
    const project = await db.project.create({ data: { ...data, workspaceId: ctx.workspaceId } });
    await logActivity(ctx, { entityType: "project", entityId: project.id, action: "created", summary: `hat Projekt ${project.key} „${project.name}“ angelegt`, link: `/projects/${project.id}` });
    await notify(ctx, data.ownerId, { type: "TASK_ASSIGNED", title: `Projektverantwortung: ${data.name}`, link: `/projects/${project.id}` });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: project.id }, message: "Projekt angelegt" };
  });
}

export async function setProjectArchived(id: string, archived: boolean): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const p = await db.project.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!p) return failure("Projekt nicht gefunden.");
    await db.project.update({ where: { id }, data: { status: archived ? "ARCHIVED" : "ACTIVE" } });
    await logActivity(ctx, { entityType: "project", entityId: id, action: archived ? "archived" : "restored", summary: `hat Projekt ${p.key} ${archived ? "archiviert" : "wiederhergestellt"}`, link: `/projects/${id}` });
    revalidatePath("/", "layout");
    return { ok: true, message: archived ? "Projekt archiviert" : "Projekt wiederhergestellt" };
  });
}
