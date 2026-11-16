"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireContext } from "@/lib/auth/context";
import { instructionTransitionSchema, instructionWithStepsSchema } from "@/lib/validation/schemas";
import { failure, safe, zodFailure, type ActionResult } from "@/lib/action-result";
import { logActivity, notify, notifyRoles } from "@/lib/services/activity";
import { APPROVAL_TRANSITIONS, buildSnapshot, canTransition, reviewReadinessProblems } from "@/lib/services/instruction-snapshot";
import { INSTRUCTION_STATUS } from "@/lib/constants";

const fullInclude = {
  steps: { include: { responsible: { select: { name: true } } } },
  assembly: { select: { id: true, code: true, name: true } },
  approvedBy: { select: { name: true } },
} satisfies Prisma.WorkInstructionInclude;

async function writeRevision(tx: Prisma.TransactionClient, instructionId: string, userId: string, note: string | null) {
  const wi = await tx.workInstruction.findUniqueOrThrow({ where: { id: instructionId }, include: fullInclude });
  await tx.instructionRevision.create({
    data: { instructionId, version: wi.version, status: wi.status, snapshot: buildSnapshot(wi), changeNote: note, createdById: userId },
  });
}

/**
 * Creates or updates the working copy incl. steps.
 * - Editing a PUBLISHED instruction starts a new version (vN+1, DRAFT). The published snapshot stays valid.
 * - Editing an instruction IN_REVIEW/APPROVED resets it to DRAFT (approval no longer applies).
 */
export async function saveInstruction(id: string | null, input: unknown): Promise<ActionResult<{ id: string; message?: string }>> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = instructionWithStepsSchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const { steps, ...data } = parsed.data;
    if (data.assemblyId && !(await db.assembly.findFirst({ where: { id: data.assemblyId, machine: { project: { workspaceId: ctx.workspaceId } } } }))) return failure("Baugruppe ungültig.");

    if (!id) {
      const last = await db.workInstruction.findFirst({ where: { workspaceId: ctx.workspaceId }, orderBy: { number: "desc" }, select: { number: true } });
      const number = `WI-${String((Number(last?.number.slice(3)) || 0) + 1).padStart(4, "0")}`;
      const wi = await db.$transaction(async (tx) => {
        const created = await tx.workInstruction.create({
          data: { ...data, workspaceId: ctx.workspaceId, number, authorId: ctx.user.id, status: "DRAFT", version: 1, steps: { create: steps.map(({ id: _id, ...s }, i) => ({ ...s, order: i + 1 })) } },
        });
        await writeRevision(tx, created.id, ctx.user.id, "Entwurf angelegt");
        return created;
      });
      await logActivity(ctx, { entityType: "instruction", entityId: wi.id, action: "created", summary: `hat Montageanweisung ${number} „${wi.title}“ angelegt`, link: `/work-instructions/${wi.id}` });
      revalidatePath("/work-instructions");
      return { ok: true, data: { id: wi.id }, message: `${number} als Entwurf angelegt` };
    }

    const existing = await db.workInstruction.findFirst({ where: { id, workspaceId: ctx.workspaceId }, include: { steps: true } });
    if (!existing) return failure("Montageanweisung nicht gefunden.");
    const newVersion = existing.status === "PUBLISHED";
    const resetApproval = existing.status === "IN_REVIEW" || existing.status === "APPROVED";

    await db.$transaction(async (tx) => {
      await tx.workInstruction.update({
        where: { id },
        data: {
          ...data,
          status: "DRAFT",
          version: newVersion ? existing.version + 1 : existing.version,
          ...(newVersion || resetApproval ? { approvedById: null, approvedAt: null } : {}),
        },
      });
      const keep = new Set(steps.map((s) => s.id).filter(Boolean));
      await tx.workStep.deleteMany({ where: { instructionId: id, id: { notIn: [...keep] as string[] } } });
      for (const [i, { id: stepId, ...s }] of steps.entries()) {
        if (stepId && existing.steps.some((x) => x.id === stepId)) await tx.workStep.update({ where: { id: stepId }, data: { ...s, order: i + 1 } });
        else await tx.workStep.create({ data: { ...s, order: i + 1, instructionId: id } });
      }
      if (newVersion) await writeRevision(tx, id, ctx.user.id, `Neue Version v${existing.version + 1} begonnen`);
    });
    revalidatePath("/", "layout");
    const message = newVersion
      ? `Version ${existing.version + 1} als Entwurf angelegt – v${existing.version} bleibt bis zur Neuveröffentlichung gültig.`
      : resetApproval
        ? "Gespeichert. Die Anweisung wurde auf Draft zurückgesetzt und muss erneut geprüft werden."
        : "Entwurf gespeichert";
    return { ok: true, data: { id }, message };
  });
}

export async function transitionInstruction(input: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = instructionTransitionSchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const { id, to, note } = parsed.data;
    const wi = await db.workInstruction.findFirst({ where: { id, workspaceId: ctx.workspaceId }, include: { steps: true } });
    if (!wi) return failure("Montageanweisung nicht gefunden.");
    if (!canTransition(wi.status, to)) return failure(`Übergang ${INSTRUCTION_STATUS[wi.status].label} → ${INSTRUCTION_STATUS[to].label} ist nicht erlaubt.`);
    if (APPROVAL_TRANSITIONS.includes(to) && !ctx.canApprove) return failure("Keine Berechtigung: Freigaben erfordern die Rolle Engineering, Qualität, Projektleitung oder Admin.");
    if (to === "APPROVED" && wi.authorId === ctx.user.id) return failure("Vier-Augen-Prinzip: Die Freigabe muss durch eine andere Person als den Autor erfolgen.");
    if (to === "IN_REVIEW") {
      const problems = reviewReadinessProblems(wi);
      if (problems.length) return failure(`Nicht bereit zur Prüfung: ${problems.join(" ")}`);
    }
    if (wi.status !== "DRAFT" && to === "DRAFT" && !note) return failure("Bitte eine Begründung für die Rückweisung angeben.");

    await db.$transaction(async (tx) => {
      await tx.workInstruction.update({
        where: { id },
        data: { status: to, ...(to === "APPROVED" ? { approvedById: ctx.user.id, approvedAt: new Date() } : {}), ...(to === "DRAFT" ? { approvedById: null, approvedAt: null } : {}) },
      });
      await writeRevision(tx, id, ctx.user.id, note ?? defaultNote(to));
    });

    const link = `/work-instructions/${id}`;
    if (to === "IN_REVIEW") await notifyRoles(ctx, ["QUALITY", "PROJECT_MANAGER"], { type: "INSTRUCTION_REVIEW", title: "Montageanweisung zur Freigabe eingereicht", body: `${wi.number} ${wi.title}`, link });
    if (to === "DRAFT") await notify(ctx, wi.authorId, { type: "INSTRUCTION_REVIEW", title: `${wi.number} zurückgewiesen`, body: note ?? undefined, link });
    if (to === "APPROVED" || to === "PUBLISHED") await notify(ctx, wi.authorId, { type: "INSTRUCTION_REVIEW", title: `${wi.number} v${wi.version}: ${INSTRUCTION_STATUS[to].label}`, link });
    await logActivity(ctx, { entityType: "instruction", entityId: id, action: to.toLowerCase(), summary: `hat ${wi.number} v${wi.version} auf „${INSTRUCTION_STATUS[to].label}“ gesetzt`, link });
    revalidatePath("/", "layout");
    return { ok: true, message: `${wi.number} v${wi.version}: ${INSTRUCTION_STATUS[to].label}` };
  });
}

function defaultNote(to: string) {
  return { IN_REVIEW: "Zur Prüfung eingereicht", APPROVED: "Fachlich freigegeben", PUBLISHED: "Für Produktion veröffentlicht", DRAFT: "Zurück in Bearbeitung" }[to] ?? null;
}

export async function deleteInstruction(id: string): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const wi = await db.workInstruction.findFirst({ where: { id, workspaceId: ctx.workspaceId }, include: { _count: { select: { workOrders: true } }, revisions: { where: { status: "PUBLISHED" }, take: 1 } } });
    if (!wi) return failure("Montageanweisung nicht gefunden.");
    if (wi.revisions.length) return failure("Bereits veröffentlichte Anweisungen können aus Nachweisgründen nicht gelöscht werden.");
    if (wi._count.workOrders) return failure("Anweisung ist mit Montageaufträgen verknüpft.");
    await db.workInstruction.delete({ where: { id } });
    await logActivity(ctx, { entityType: "instruction", entityId: id, action: "deleted", summary: `hat Entwurf ${wi.number} gelöscht` });
    revalidatePath("/work-instructions");
    return { ok: true, message: `${wi.number} gelöscht` };
  });
}

export async function linkDocumentToInstruction(instructionId: string, documentId: string, linked: boolean): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const [wi, doc] = await Promise.all([
      db.workInstruction.findFirst({ where: { id: instructionId, workspaceId: ctx.workspaceId } }),
      db.document.findFirst({ where: { id: documentId, workspaceId: ctx.workspaceId } }),
    ]);
    if (!wi || !doc) return failure("Nicht gefunden.");
    await db.document.update({ where: { id: documentId }, data: { workInstructionId: linked ? instructionId : null } });
    revalidatePath(`/work-instructions/${instructionId}`);
    return { ok: true, message: linked ? `${doc.number} verknüpft` : `${doc.number} entfernt` };
  });
}
