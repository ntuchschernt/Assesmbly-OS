import "server-only";
import type { Prisma, QualityIssueType, QualityStatus, Severity } from "@prisma/client";
import { db } from "@/lib/db";

export type QualityFilters = { q?: string; status?: QualityStatus | "OPEN"; severity?: Severity; type?: QualityIssueType; projectId?: string; assigneeId?: string };

export function listQualityIssues(workspaceId: string, f: QualityFilters = {}) {
  const where: Prisma.QualityIssueWhereInput = { workspaceId };
  if (f.status === "OPEN") where.status = { in: ["NEW", "INVESTIGATING", "ACTION_REQUIRED", "IN_REVIEW"] };
  else if (f.status) where.status = f.status;
  if (f.severity) where.severity = f.severity;
  if (f.type) where.type = f.type;
  if (f.projectId) where.projectId = f.projectId;
  if (f.assigneeId) where.assigneeId = f.assigneeId;
  if (f.q) {
    const c = { contains: f.q, mode: "insensitive" as const };
    where.OR = [{ title: c }, { number: c }, { description: c }, { rootCause: c }];
  }
  return db.qualityIssue.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      assignee: { select: { name: true } },
      project: { select: { id: true, key: true } },
      assembly: { select: { id: true, code: true, name: true } },
      workOrder: { select: { id: true, number: true } },
      _count: { select: { actions: true } },
      actions: { select: { done: true } },
    },
  });
}

export function getQualityIssue(workspaceId: string, id: string) {
  return db.qualityIssue.findFirst({
    where: { id, workspaceId },
    include: {
      reporter: { select: { name: true } },
      assignee: { select: { id: true, name: true } },
      project: { select: { id: true, key: true, name: true } },
      machine: { select: { id: true, code: true, name: true } },
      assembly: { select: { id: true, code: true, name: true } },
      workOrder: { select: { id: true, number: true, title: true } },
      task: { select: { id: true, number: true, title: true, status: true } },
      document: { select: { id: true, number: true, title: true } },
      actions: { orderBy: { createdAt: "asc" }, include: { assignee: { select: { name: true } } } },
    },
  });
}
