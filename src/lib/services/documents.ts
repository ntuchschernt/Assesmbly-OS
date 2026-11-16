import "server-only";
import type { DocumentStatus, DocumentType, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type DocumentFilters = { q?: string; type?: DocumentType; status?: DocumentStatus; projectId?: string; assemblyId?: string };

export function listDocuments(workspaceId: string, f: DocumentFilters = {}) {
  const where: Prisma.DocumentWhereInput = { workspaceId };
  if (f.type) where.type = f.type;
  if (f.status) where.status = f.status;
  else where.status = { not: "ARCHIVED" };
  if (f.projectId) where.projectId = f.projectId;
  if (f.assemblyId) where.assemblyId = f.assemblyId;
  if (f.q) {
    const c = { contains: f.q, mode: "insensitive" as const };
    where.OR = [{ title: c }, { number: c }, { description: c }, { category: c }, { tags: { has: f.q } }, { extractedText: c }];
  }
  return db.document.findMany({
    where,
    orderBy: { number: "asc" },
    include: {
      project: { select: { id: true, key: true } },
      assembly: { select: { id: true, code: true, name: true } },
      owner: { select: { name: true } },
      versions: { orderBy: { version: "desc" }, take: 1 },
    },
  });
}

export function getDocument(workspaceId: string, id: string) {
  return db.document.findFirst({
    where: { id, workspaceId },
    include: {
      project: { select: { id: true, key: true, name: true } },
      assembly: { select: { id: true, code: true, name: true } },
      workInstruction: { select: { id: true, number: true, title: true } },
      owner: { select: { id: true, name: true } },
      versions: { orderBy: { version: "desc" }, include: { uploadedBy: { select: { name: true } } } },
      qualityIssues: { select: { id: true, number: true, title: true, status: true, severity: true } },
    },
  });
}

export async function nextDocumentNumber(workspaceId: string) {
  const last = await db.document.findFirst({ where: { workspaceId }, orderBy: { number: "desc" }, select: { number: true } });
  return `DOC-${String((Number(last?.number.slice(4)) || 0) + 1).padStart(4, "0")}`;
}
