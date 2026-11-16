import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { InstructionSnapshot } from "./instruction-snapshot";

export type PublishedRevision = { id: string; instructionId: string; version: number; createdAt: Date; snapshot: InstructionSnapshot };

/** Latest PUBLISHED revision per instruction – the only valid production content. */
export async function getPublishedRevisions(instructionIds: string[]): Promise<Map<string, PublishedRevision>> {
  const map = new Map<string, PublishedRevision>();
  if (!instructionIds.length) return map;
  const revs = await db.instructionRevision.findMany({
    where: { instructionId: { in: instructionIds }, status: "PUBLISHED" },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
  });
  for (const r of revs) {
    if (!map.has(r.instructionId)) {
      map.set(r.instructionId, { id: r.id, instructionId: r.instructionId, version: r.version, createdAt: r.createdAt, snapshot: r.snapshot as unknown as InstructionSnapshot });
    }
  }
  return map;
}

export async function getPublishedRevision(instructionId: string) {
  return (await getPublishedRevisions([instructionId])).get(instructionId) ?? null;
}

export function listInstructions(workspaceId: string, where: Prisma.WorkInstructionWhereInput = {}) {
  return db.workInstruction.findMany({
    where: { workspaceId, ...where },
    include: {
      assembly: { select: { id: true, code: true, name: true, machine: { select: { name: true, project: { select: { key: true } } } } } },
      author: { select: { name: true } },
      _count: { select: { steps: true, workOrders: true } },
    },
    orderBy: { number: "asc" },
  });
}

export function getInstruction(workspaceId: string, id: string) {
  return db.workInstruction.findFirst({
    where: { id, workspaceId },
    include: {
      steps: { orderBy: { order: "asc" }, include: { responsible: { select: { id: true, name: true } } } },
      assembly: { select: { id: true, code: true, name: true } },
      author: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
      revisions: { orderBy: { createdAt: "desc" }, include: { createdBy: { select: { name: true } } } },
      workOrders: { select: { id: true, number: true, title: true, status: true } },
      documents: { select: { id: true, number: true, title: true, status: true } },
    },
  });
}
