"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireContext } from "@/lib/auth/context";
import { qualityActionSchema, qualitySchema, qualityStatus } from "@/lib/validation/schemas";
import { failure, safe, zodFailure, type ActionResult } from "@/lib/action-result";
import { logActivity, notify, notifyRoles } from "@/lib/services/activity";
import { QUALITY_STATUS } from "@/lib/constants";

async function validateLinks(workspaceId: string, d: z.output<typeof qualitySchema>) {
  const checks: [string | null, () => Promise<unknown>, string][] = [
    [d.projectId, () => db.project.findFirst({ where: { id: d.projectId!, workspaceId } }), "Projekt"],
    [d.machineId, () => db.machine.findFirst({ where: { id: d.machineId!, project: { workspaceId } } }), "Maschine"],
    [d.assemblyId, () => db.assembly.findFirst({ where: { id: d.assemblyId!, machine: { project: { workspaceId } } } }), "Baugruppe"],
    [d.workOrderId, () => db.workOrder.findFirst({ where: { id: d.workOrderId!, assembly: { machine: { project: { workspaceId } } } } }), "Montageauftrag"],
    [d.taskId, () => db.task.findFirst({ where: { id: d.taskId!, workspaceId } }), "Aufgabe"],
    [d.documentId, () => db.document.findFirst({ where: { id: d.documentId!, workspaceId } }), "Dokument"],
  ];
  for (const [id, find, label] of checks) if (id && !(await find())) return `${label} ungültig`;
  return null;
}

/** Fills machine/project from the most specific link (work order → assembly → machine → project). */
async function deriveHierarchy(d: z.output<typeof qualitySchema>) {
  const out = { ...d };
  if (out.workOrderId && !out.assemblyId) out.assemblyId = (await db.workOrder.findUnique({ where: { id: out.workOrderId } }))?.assemblyId ?? null;
  if (out.assemblyId && !out.machineId) out.machineId = (await db.assembly.findUnique({ where: { id: out.assemblyId } }))?.machineId ?? null;
  if (out.machineId && !out.projectId) out.projectId = (await db.machine.findUnique({ where: { id: out.machineId } }))?.projectId ?? null;
  return out;
}

export async function saveQualityIssue(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = qualitySchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const linkError = await validateLinks(ctx.workspaceId, parsed.data);
    if (linkError) return failure(linkError);
    const data = await deriveHierarchy(parsed.data);

    if (id) {
      const existing = await db.qualityIssue.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
      if (!existing) return failure("Qualitätsmeldung nicht gefunden.");
      await db.qualityIssue.update({ where: { id }, data });
      if (data.assigneeId && data.assigneeId !== existing.assigneeId) {
        await notify(ctx, data.assigneeId, { type: "QUALITY_ISSUE_CREATED", title: `Qualitätsmeldung zugewiesen: ${existing.number}`, body: data.title, link: `/quality/${id}` });
      }
      revalidatePath("/", "layout");
      return { ok: true, data: { id }, message: "Qualitätsmeldung gespeichert" };
    }
    const last = await db.qualityIssue.findFirst({ where: { workspaceId: ctx.workspaceId }, orderBy: { number: "desc" }, select: { number: true } });
    const number = `QM-${String((Number(last?.number.slice(3)) || 0) + 1).padStart(4, "0")}`;
    const issue = await db.qualityIssue.create({ data: { ...data, number, workspaceId: ctx.workspaceId, reporterId: ctx.user.id } });
    const note = { type: "QUALITY_ISSUE_CREATED" as const, title: `${data.severity === "CRITICAL" ? "Kritische " : "Neue "}Qualitätsmeldung ${number}`, body: data.title, link: `/quality/${issue.id}` };
    await notify(ctx, data.assigneeId, note);
    await notifyRoles(ctx, ["QUALITY"], note);
    if (data.projectId) {
      const p = await db.project.findUnique({ where: { id: data.projectId } });
      if (p?.ownerId !== data.assigneeId) await notify(ctx, p?.ownerId, note);
    }
    await logActivity(ctx, { entityType: "quality", entityId: issue.id, action: "created", summary: `hat ${number} „${issue.title}“ gemeldet`, link: `/quality/${issue.id}` });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: issue.id }, message: `${number} erstellt` };
  });
}

export async function setQualityStatus(id: string, status: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const s = qualityStatus.safeParse(status);
    if (!s.success) return failure("Ungültiger Status.");
    const issue = await db.qualityIssue.findFirst({ where: { id, workspaceId: ctx.workspaceId }, include: { actions: true } });
    if (!issue) return failure("Qualitätsmeldung nicht gefunden.");
    if ((s.data === "RESOLVED" || s.data === "CLOSED") && !issue.rootCause) return failure("Vor dem Abschluss muss eine Ursache (Root Cause) dokumentiert sein.");
    if (s.data === "CLOSED" && issue.actions.some((a) => !a.done)) return failure("Schließen nicht möglich: Es sind noch Maßnahmen offen.");
    await db.qualityIssue.update({
      where: { id },
      data: { status: s.data, resolvedAt: s.data === "RESOLVED" || s.data === "CLOSED" ? (issue.resolvedAt ?? new Date()) : null },
    });
    await logActivity(ctx, { entityType: "quality", entityId: id, action: "status", summary: `hat ${issue.number} auf „${QUALITY_STATUS[s.data].label}“ gesetzt`, link: `/quality/${id}` });
    revalidatePath("/", "layout");
    return { ok: true, message: `${issue.number}: ${QUALITY_STATUS[s.data].label}` };
  });
}

export async function addQualityAction(input: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = qualityActionSchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const issue = await db.qualityIssue.findFirst({ where: { id: parsed.data.issueId, workspaceId: ctx.workspaceId } });
    if (!issue) return failure("Qualitätsmeldung nicht gefunden.");
    await db.qualityAction.create({ data: parsed.data });
    await notify(ctx, parsed.data.assigneeId, { type: "TASK_ASSIGNED", title: `Maßnahme zu ${issue.number}`, body: parsed.data.title, link: `/quality/${issue.id}` });
    revalidatePath(`/quality/${issue.id}`);
    return { ok: true, message: "Maßnahme hinzugefügt" };
  });
}

export async function completeQualityAction(id: string, done: boolean, result?: string): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const action = await db.qualityAction.findFirst({ where: { id, issue: { workspaceId: ctx.workspaceId } } });
    if (!action) return failure("Maßnahme nicht gefunden.");
    if (done && action.type === "VERIFICATION" && !result?.trim() && !action.result) return failure("Prüfungen benötigen ein dokumentiertes Ergebnis.");
    await db.qualityAction.update({ where: { id }, data: { done, result: result?.trim() ? result.trim().slice(0, 1000) : action.result } });
    revalidatePath(`/quality/${action.issueId}`);
    return { ok: true, message: done ? "Maßnahme erledigt" : "Maßnahme wieder geöffnet" };
  });
}

export async function deleteQualityAction(id: string): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const action = await db.qualityAction.findFirst({ where: { id, issue: { workspaceId: ctx.workspaceId } } });
    if (!action) return failure("Maßnahme nicht gefunden.");
    await db.qualityAction.delete({ where: { id } });
    revalidatePath(`/quality/${action.issueId}`);
    return { ok: true, message: "Maßnahme entfernt" };
  });
}
