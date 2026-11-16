import "server-only";
import { db } from "@/lib/db";

export type SearchCategory = "project" | "task" | "machine" | "assembly" | "document" | "instruction" | "quality";

export type SearchHit = {
  id: string;
  category: SearchCategory;
  code: string;
  title: string;
  subtitle?: string;
  href: string;
  status?: string;
};

export const SEARCH_CATEGORY_LABEL: Record<SearchCategory, string> = {
  project: "Projekte",
  task: "Aufgaben",
  machine: "Maschinen",
  assembly: "Baugruppen",
  document: "Dokumente",
  instruction: "Montageanweisungen",
  quality: "Qualitätsmeldungen",
};

/**
 * Global search across all modules of the active workspace.
 * MVP: case-insensitive substring match (PostgreSQL ILIKE). Swap for full-text/pgvector later.
 */
export async function globalSearch(workspaceId: string, rawQuery: string, take = 6): Promise<SearchHit[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];
  const c = { contains: q, mode: "insensitive" as const };
  const taskNumber = /^(tsk-)?(\d+)$/i.exec(q)?.[2];
  const inWs = { project: { workspaceId } };

  const [projects, tasks, machines, assemblies, documents, instructions, issues] = await Promise.all([
    db.project.findMany({ where: { workspaceId, OR: [{ name: c }, { key: c }, { customer: c }, { description: c }] }, take }),
    db.task.findMany({
      where: { workspaceId, OR: [{ title: c }, { description: c }, { labels: { has: q } }, ...(taskNumber ? [{ number: Number(taskNumber) }] : [])] },
      include: { project: { select: { name: true } } },
      take,
    }),
    db.machine.findMany({ where: { ...inWs, OR: [{ name: c }, { code: c }, { serialNumber: c }] }, include: { project: { select: { name: true } } }, take }),
    db.assembly.findMany({ where: { machine: inWs, OR: [{ name: c }, { code: c }, { description: c }] }, include: { machine: { select: { name: true } } }, take }),
    db.document.findMany({ where: { workspaceId, OR: [{ title: c }, { number: c }, { description: c }, { category: c }, { tags: { has: q } }, { extractedText: c }] }, take }),
    db.workInstruction.findMany({ where: { workspaceId, OR: [{ title: c }, { number: c }, { description: c }] }, take }),
    db.qualityIssue.findMany({ where: { workspaceId, OR: [{ title: c }, { number: c }, { description: c }, { rootCause: c }] }, take }),
  ]);

  return [
    ...projects.map((p) => ({ id: p.id, category: "project" as const, code: p.key, title: p.name, subtitle: p.customer ?? undefined, href: `/projects/${p.id}`, status: p.status })),
    ...tasks.map((t) => ({ id: t.id, category: "task" as const, code: `TSK-${t.number}`, title: t.title, subtitle: t.project?.name, href: `/tasks/${t.id}`, status: t.status })),
    ...machines.map((m) => ({ id: m.id, category: "machine" as const, code: m.code, title: m.name, subtitle: m.project.name, href: `/assembly?machine=${m.id}`, status: m.status })),
    ...assemblies.map((a) => ({ id: a.id, category: "assembly" as const, code: a.code, title: a.name, subtitle: a.machine.name, href: `/assembly/assemblies/${a.id}`, status: a.status })),
    ...documents.map((d) => ({ id: d.id, category: "document" as const, code: d.number, title: d.title, subtitle: d.category ?? undefined, href: `/documents/${d.id}`, status: d.status })),
    ...instructions.map((w) => ({ id: w.id, category: "instruction" as const, code: w.number, title: w.title, subtitle: `Version ${w.version}`, href: `/work-instructions/${w.id}`, status: w.status })),
    ...issues.map((i) => ({ id: i.id, category: "quality" as const, code: i.number, title: i.title, subtitle: i.severity, href: `/quality/${i.id}`, status: i.status })),
  ];
}
