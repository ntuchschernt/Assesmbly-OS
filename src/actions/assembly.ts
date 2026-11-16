"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireContext } from "@/lib/auth/context";
import { assemblySchema, machineSchema, stepExecutionSchema, timeEntrySchema, workOrderSchema, workOrderStatusSchema } from "@/lib/validation/schemas";
import { failure, safe, zodFailure, type ActionResult } from "@/lib/action-result";
import { logActivity, notify } from "@/lib/services/activity";
import { getPublishedRevision } from "@/lib/services/instructions";
import { checkWorkOrderTransition } from "@/lib/services/work-order-rules";
import { WORK_ORDER_STATUS } from "@/lib/constants";

const inWorkspace = (workspaceId: string) => ({ machine: { project: { workspaceId } } });

export async function saveMachine(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = machineSchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const project = await db.project.findFirst({ where: { id: parsed.data.projectId, workspaceId: ctx.workspaceId } });
    if (!project) return failure("Projekt nicht gefunden.");
    if (id) {
      const m = await db.machine.findFirst({ where: { id, project: { workspaceId: ctx.workspaceId } } });
      if (!m) return failure("Maschine nicht gefunden.");
      await db.machine.update({ where: { id }, data: parsed.data });
    } else {
      const m = await db.machine.create({ data: parsed.data });
      id = m.id;
      await logActivity(ctx, { entityType: "machine", entityId: m.id, action: "created", summary: `hat Maschine ${m.code} in ${project.key} angelegt`, link: `/assembly?machine=${m.id}` });
    }
    revalidatePath("/", "layout");
    return { ok: true, data: { id }, message: "Maschine gespeichert" };
  });
}

export async function saveAssembly(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = assemblySchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const data = parsed.data;
    const machine = await db.machine.findFirst({ where: { id: data.machineId, project: { workspaceId: ctx.workspaceId } } });
    if (!machine) return failure("Maschine nicht gefunden.");
    if (data.parentId) {
      const parent = await db.assembly.findFirst({ where: { id: data.parentId, machineId: data.machineId } });
      if (!parent) return failure("Übergeordnete Baugruppe muss zur selben Maschine gehören.");
      if (parent.parentId) return failure("Unterbaugruppen können nur einer Hauptbaugruppe zugeordnet werden (2 Ebenen).");
      if (id && parent.id === id) return failure("Eine Baugruppe kann nicht sich selbst untergeordnet werden.");
    }
    if (id) {
      const a = await db.assembly.findFirst({ where: { id, ...inWorkspace(ctx.workspaceId) }, include: { _count: { select: { children: true } } } });
      if (!a) return failure("Baugruppe nicht gefunden.");
      if (data.parentId && a._count.children > 0) return failure("Baugruppe mit Unterbaugruppen kann nicht selbst untergeordnet werden.");
      await db.assembly.update({ where: { id }, data });
    } else {
      const a = await db.assembly.create({ data });
      id = a.id;
      await logActivity(ctx, { entityType: "assembly", entityId: a.id, action: "created", summary: `hat ${data.parentId ? "Unterbaugruppe" : "Baugruppe"} ${a.code} „${a.name}“ angelegt`, link: `/assembly/assemblies/${a.id}` });
    }
    revalidatePath("/", "layout");
    return { ok: true, data: { id }, message: "Baugruppe gespeichert" };
  });
}

export async function saveWorkOrder(id: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = workOrderSchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const data = parsed.data;
    const assembly = await db.assembly.findFirst({ where: { id: data.assemblyId, ...inWorkspace(ctx.workspaceId) } });
    if (!assembly) return failure("Baugruppe nicht gefunden.");
    if (data.workInstructionId && !(await db.workInstruction.findFirst({ where: { id: data.workInstructionId, workspaceId: ctx.workspaceId } }))) return failure("Montageanweisung nicht gefunden.");

    if (id) {
      const wo = await db.workOrder.findFirst({ where: { id, assembly: inWorkspace(ctx.workspaceId) } });
      if (!wo) return failure("Montageauftrag nicht gefunden.");
      if (wo.status === "COMPLETED") return failure("Abgeschlossene Montageaufträge können nicht mehr geändert werden.");
      await db.workOrder.update({ where: { id }, data });
      if (data.assigneeId && data.assigneeId !== wo.assigneeId) {
        await notify(ctx, data.assigneeId, { type: "TASK_ASSIGNED", title: `Montageauftrag zugewiesen: ${wo.number}`, body: data.title, link: `/assembly/work-orders/${id}` });
      }
      revalidatePath("/", "layout");
      return { ok: true, data: { id }, message: "Montageauftrag gespeichert" };
    }
    const year = new Date().getFullYear();
    const count = await db.workOrder.count({ where: { number: { startsWith: `WO-${year}-` } } });
    let seq = 141 + count;
    let number = `WO-${year}-${String(seq).padStart(4, "0")}`;
    while (await db.workOrder.findUnique({ where: { number } })) number = `WO-${year}-${String(++seq).padStart(4, "0")}`;
    const wo = await db.workOrder.create({ data: { ...data, number } });
    await notify(ctx, data.assigneeId, { type: "TASK_ASSIGNED", title: `Montageauftrag zugewiesen: ${number}`, body: data.title, link: `/assembly/work-orders/${wo.id}` });
    await logActivity(ctx, { entityType: "workOrder", entityId: wo.id, action: "created", summary: `hat Montageauftrag ${number} „${wo.title}“ angelegt`, link: `/assembly/work-orders/${wo.id}` });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: wo.id }, message: `${number} angelegt` };
  });
}

export async function setWorkOrderStatus(id: string, status: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const to = workOrderStatusSchema.safeParse(status);
    if (!to.success) return failure("Ungültiger Status.");
    const wo = await db.workOrder.findFirst({
      where: { id, assembly: inWorkspace(ctx.workspaceId) },
      include: { stepExecutions: true, assembly: { include: { machine: { include: { project: true } } } } },
    });
    if (!wo) return failure("Montageauftrag nicht gefunden.");
    const rev = wo.workInstructionId ? await getPublishedRevision(wo.workInstructionId) : null;
    const stepIds = new Set(rev?.snapshot.steps.map((s) => s.id) ?? []);
    const execs = wo.stepExecutions.filter((e) => stepIds.has(e.stepId));
    const error = checkWorkOrderTransition({
      from: wo.status,
      to: to.data,
      hasInstruction: !!wo.workInstructionId,
      hasPublishedInstruction: !!rev,
      totalSteps: stepIds.size,
      doneSteps: execs.filter((e) => e.status === "DONE").length,
      failedSteps: execs.filter((e) => e.status === "FAILED").length,
    });
    if (error) return failure(error);

    await db.workOrder.update({
      where: { id },
      data: {
        status: to.data,
        startedAt: to.data === "IN_PROGRESS" && !wo.startedAt ? new Date() : undefined,
        completedAt: to.data === "COMPLETED" ? new Date() : undefined,
      },
    });
    await logActivity(ctx, { entityType: "workOrder", entityId: id, action: to.data.toLowerCase(), summary: `hat ${wo.number} auf „${WORK_ORDER_STATUS[to.data].label}“ gesetzt`, link: `/assembly/work-orders/${id}` });
    if (to.data === "COMPLETED") {
      await notify(ctx, wo.assembly.machine.project.ownerId, { type: "WORK_ORDER_COMPLETED", title: "Montageauftrag abgeschlossen", body: `${wo.number} ${wo.title}`, link: `/assembly/work-orders/${id}` });
    }
    revalidatePath("/", "layout");
    return { ok: true, message: `${wo.number}: ${WORK_ORDER_STATUS[to.data].label}` };
  });
}

export async function logTime(input: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = timeEntrySchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const wo = await db.workOrder.findFirst({ where: { id: parsed.data.workOrderId, assembly: inWorkspace(ctx.workspaceId) } });
    if (!wo) return failure("Montageauftrag nicht gefunden.");
    if (wo.status === "PLANNED") return failure("Zeiten können erst nach Freigabe des Auftrags erfasst werden.");
    await db.timeEntry.create({ data: { workOrderId: wo.id, userId: ctx.user.id, minutes: parsed.data.minutes, note: parsed.data.note, date: parsed.data.date ?? new Date() } });
    revalidatePath(`/assembly/work-orders/${wo.id}`);
    return { ok: true, message: `${(parsed.data.minutes / 60).toFixed(1).replace(".", ",")} h erfasst` };
  });
}

export async function deleteTimeEntry(id: string): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const t = await db.timeEntry.findFirst({ where: { id, workOrder: { assembly: inWorkspace(ctx.workspaceId) } }, include: { workOrder: true } });
    if (!t) return failure("Zeiteintrag nicht gefunden.");
    if (t.workOrder.status === "COMPLETED") return failure("Zeiten abgeschlossener Aufträge sind gesperrt.");
    await db.timeEntry.delete({ where: { id } });
    revalidatePath(`/assembly/work-orders/${t.workOrderId}`);
    return { ok: true, message: "Zeiteintrag entfernt" };
  });
}

/** Shop-floor execution: record the result of a step from the PUBLISHED instruction. */
export async function recordStep(input: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = stepExecutionSchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const { workOrderId, stepId, status, resultNote } = parsed.data;
    const wo = await db.workOrder.findFirst({ where: { id: workOrderId, assembly: inWorkspace(ctx.workspaceId) } });
    if (!wo) return failure("Montageauftrag nicht gefunden.");
    if (wo.status !== "IN_PROGRESS") return failure("Arbeitsschritte können nur bei laufendem Auftrag (In Progress) erfasst werden.");
    if (!wo.workInstructionId) return failure("Keine Montageanweisung verknüpft.");
    const rev = await getPublishedRevision(wo.workInstructionId);
    if (!rev) return failure("Keine veröffentlichte Montageanweisung – Ausführung gesperrt.");
    const step = rev.snapshot.steps.find((s) => s.id === stepId);
    if (!step) return failure("Arbeitsschritt gehört nicht zur gültigen Version.");
    if (status !== "PENDING" && step.isCheckpoint && !resultNote) {
      return { ok: false, error: "Prüfpunkt: Bitte Messwert / Prüfergebnis dokumentieren.", fieldErrors: { resultNote: "Pflicht bei Prüfpunkten" } };
    }
    if (status === "FAILED" && !resultNote) return { ok: false, error: "Bitte die Abweichung beschreiben.", fieldErrors: { resultNote: "Pflicht bei „nicht i.O.“" } };

    await db.stepExecution.upsert({
      where: { workOrderId_stepId: { workOrderId, stepId } },
      update: { status, resultNote, version: rev.version, completedById: status === "PENDING" ? null : ctx.user.id, completedAt: status === "PENDING" ? null : new Date() },
      create: { workOrderId, stepId, status, resultNote, version: rev.version, completedById: ctx.user.id, completedAt: new Date() },
    });
    if (status !== "PENDING") {
      await logActivity(ctx, { entityType: "workOrder", entityId: wo.id, action: "step", summary: `hat Schritt ${step.order} in ${wo.number} ${status === "DONE" ? "abgeschlossen" : "als nicht i.O. gemeldet"}`, link: `/assembly/work-orders/${wo.id}` });
    }
    revalidatePath(`/assembly/work-orders/${wo.id}`, "layout");
    return { ok: true, message: status === "DONE" ? `Schritt ${step.order} i.O.` : status === "FAILED" ? `Schritt ${step.order} nicht i.O.` : `Schritt ${step.order} zurückgesetzt` };
  });
}
