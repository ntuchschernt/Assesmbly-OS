import "server-only";
import type { Prisma, Priority, TaskStatus } from "@prisma/client";
import { db } from "@/lib/db";

export type TaskFilters = {
  q?: string;
  status?: TaskStatus;
  priority?: Priority;
  assigneeId?: string;
  projectId?: string;
  label?: string;
  overdue?: boolean;
};

export const taskListInclude = {
  assignee: { select: { id: true, name: true } },
  project: { select: { id: true, key: true, name: true } },
  assembly: { select: { id: true, code: true, name: true } },
  workOrder: { select: { id: true, number: true } },
  _count: { select: { comments: true, attachments: true } },
} satisfies Prisma.TaskInclude;

export function buildTaskWhere(workspaceId: string, f: TaskFilters): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { workspaceId };
  if (f.status) where.status = f.status;
  if (f.priority) where.priority = f.priority;
  if (f.assigneeId) where.assigneeId = f.assigneeId === "none" ? null : f.assigneeId;
  if (f.projectId) where.projectId = f.projectId;
  if (f.label) where.labels = { has: f.label };
  if (f.overdue) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    where.dueDate = { lt: today };
    where.status = { not: "DONE" };
  }
  if (f.q) {
    const c = { contains: f.q, mode: "insensitive" as const };
    const num = /^(tsk-)?(\d+)$/i.exec(f.q)?.[2];
    where.OR = [{ title: c }, { description: c }, ...(num ? [{ number: Number(num) }] : [])];
  }
  return where;
}

export function listTasks(workspaceId: string, f: TaskFilters = {}) {
  return db.task.findMany({
    where: buildTaskWhere(workspaceId, f),
    include: taskListInclude,
    orderBy: [{ position: "asc" }, { number: "asc" }],
  });
}
export type TaskListItem = Awaited<ReturnType<typeof listTasks>>[number];

export function getTask(workspaceId: string, id: string) {
  return db.task.findFirst({
    where: { id, workspaceId },
    include: {
      ...taskListInclude,
      reporter: { select: { name: true } },
      comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      attachments: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { name: true } } } },
      qualityIssues: { select: { id: true, number: true, title: true, status: true } },
    },
  });
}

export async function allLabels(workspaceId: string) {
  const rows = await db.task.findMany({ where: { workspaceId }, select: { labels: true } });
  return Array.from(new Set(rows.flatMap((r) => r.labels))).sort((a, b) => a.localeCompare(b, "de"));
}

/** Options for linking selects (projects, assemblies, work orders) in task / quality forms. */
export async function linkOptions(workspaceId: string) {
  const [projects, machines, assemblies, workOrders, tasks, documents] = await Promise.all([
    db.project.findMany({ where: { workspaceId, status: { not: "ARCHIVED" } }, orderBy: { key: "asc" }, select: { id: true, key: true, name: true } }),
    db.machine.findMany({ where: { project: { workspaceId } }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, projectId: true } }),
    db.assembly.findMany({ where: { machine: { project: { workspaceId } } }, orderBy: { code: "asc" }, select: { id: true, code: true, name: true, machineId: true, machine: { select: { projectId: true } } } }),
    db.workOrder.findMany({ where: { assembly: { machine: { project: { workspaceId } } } }, orderBy: { number: "asc" }, select: { id: true, number: true, title: true, assemblyId: true } }),
    db.task.findMany({ where: { workspaceId }, orderBy: { number: "asc" }, select: { id: true, number: true, title: true } }),
    db.document.findMany({ where: { workspaceId }, orderBy: { number: "asc" }, select: { id: true, number: true, title: true } }),
  ]);
  return {
    projects: projects.map((p) => ({ value: p.id, label: `${p.key} · ${p.name}` })),
    machines: machines.map((m) => ({ value: m.id, label: `${m.code} · ${m.name}`, projectId: m.projectId })),
    assemblies: assemblies.map((a) => ({ value: a.id, label: `${a.code} · ${a.name}`, projectId: a.machine.projectId, machineId: a.machineId })),
    workOrders: workOrders.map((w) => ({ value: w.id, label: `${w.number} · ${w.title}`, assemblyId: w.assemblyId })),
    tasks: tasks.map((t) => ({ value: t.id, label: `TSK-${t.number} · ${t.title}` })),
    documents: documents.map((d) => ({ value: d.id, label: `${d.number} · ${d.title}` })),
  };
}
export type LinkOptions = Awaited<ReturnType<typeof linkOptions>>;

/** Fractional ordering for kanban: position between neighbours, or appended at the end. */
export function positionBetween(prev: number | null, next: number | null): number {
  if (prev === null && next === null) return 1000;
  if (prev === null) return next! - 1000;
  if (next === null) return prev + 1000;
  return (prev + next) / 2;
}
