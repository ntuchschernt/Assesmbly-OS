import "server-only";
import type { Prisma, ProjectStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { listWorkOrders } from "./work-orders";
import { projectProgress } from "./progress";

export type ProjectFilters = { q?: string; status?: ProjectStatus | "ALL_ACTIVE" | "ALL"; ownerId?: string };

export async function listProjects(workspaceId: string, filters: ProjectFilters = {}) {
  const where: Prisma.ProjectWhereInput = { workspaceId };
  if (!filters.status || filters.status === "ALL_ACTIVE") where.status = { not: "ARCHIVED" };
  else if (filters.status !== "ALL") where.status = filters.status;
  if (filters.ownerId) where.ownerId = filters.ownerId;
  if (filters.q) {
    const c = { contains: filters.q, mode: "insensitive" as const };
    where.OR = [{ name: c }, { key: c }, { customer: c }];
  }
  const [projects, workOrders, taskGroups] = await Promise.all([
    db.project.findMany({
      where,
      include: { owner: { select: { id: true, name: true } }, _count: { select: { machines: true, qualityIssues: { where: { status: { in: ["NEW", "INVESTIGATING", "ACTION_REQUIRED", "IN_REVIEW"] } } } } } },
      orderBy: [{ status: "asc" }, { startDate: "asc" }],
    }),
    listWorkOrders(workspaceId),
    db.task.groupBy({ by: ["projectId", "status"], where: { workspaceId }, _count: true }),
  ]);
  return projects.map((p) => {
    const tg = taskGroups.filter((g) => g.projectId === p.id);
    const tasksTotal = tg.reduce((a, g) => a + g._count, 0);
    const tasksDone = tg.filter((g) => g.status === "DONE").reduce((a, g) => a + g._count, 0);
    const wos = workOrders.filter((w) => w.assembly.machine.project.id === p.id);
    return {
      ...p,
      tasksTotal,
      tasksDone,
      workOrderCount: wos.length,
      progress: projectProgress({ status: p.status, tasksDone, tasksTotal, workOrderProgress: wos.map((w) => w.progress) }),
    };
  });
}

export type ProjectListItem = Awaited<ReturnType<typeof listProjects>>[number];

export function getProject(workspaceId: string, id: string) {
  return db.project.findFirst({
    where: { id, workspaceId },
    include: {
      owner: { select: { id: true, name: true } },
      machines: {
        orderBy: { code: "asc" },
        include: { assemblies: { where: { parentId: null }, orderBy: { code: "asc" }, include: { children: { orderBy: { code: "asc" } }, responsible: { select: { name: true } } } } },
      },
      tasks: { orderBy: [{ status: "asc" }, { dueDate: "asc" }], include: { assignee: { select: { name: true } } } },
      documents: { orderBy: { number: "asc" } },
      qualityIssues: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function projectOptions(workspaceId: string) {
  const projects = await db.project.findMany({ where: { workspaceId, status: { not: "ARCHIVED" } }, orderBy: { name: "asc" }, select: { id: true, name: true, key: true } });
  return projects.map((p) => ({ value: p.id, label: `${p.key} · ${p.name}` }));
}
