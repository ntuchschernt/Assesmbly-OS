import "server-only";
import { db } from "@/lib/db";
import { QUALITY_OPEN_STATUSES } from "@/lib/constants";
import { listWorkOrders } from "./work-orders";
import { listProjects } from "./projects";
import { average } from "./progress";

export async function getDashboard(workspaceId: string, userId: string, now = new Date()) {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [projects, workOrders, taskStatus, overdueTasks, myTasks, openIssues, activities] = await Promise.all([
    listProjects(workspaceId),
    listWorkOrders(workspaceId),
    db.task.groupBy({ by: ["status"], where: { workspaceId }, _count: true }),
    db.task.count({ where: { workspaceId, status: { not: "DONE" }, dueDate: { lt: startOfToday } } }),
    db.task.findMany({
      where: { workspaceId, assigneeId: userId, status: { not: "DONE" } },
      orderBy: [{ dueDate: "asc" }],
      take: 6,
      include: { project: { select: { key: true } } },
    }),
    db.qualityIssue.findMany({
      where: { workspaceId, status: { in: QUALITY_OPEN_STATUSES } },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      include: { assembly: { select: { name: true } } },
    }),
    db.activity.findMany({ where: { workspaceId }, orderBy: { createdAt: "desc" }, take: 8, include: { actor: { select: { name: true } } } }),
  ]);

  const activeWorkOrders = workOrders.filter((w) => w.status !== "PLANNED" || w.progress > 0);
  const openTasks = taskStatus.filter((t) => t.status !== "DONE").reduce((a, t) => a + t._count, 0);

  // Assembly progress per top-level assembly (aggregated work orders)
  const byAssembly = new Map<string, { id: string; code: string; name: string; machine: string; progress: number[]; status: string[] }>();
  for (const w of workOrders) {
    const key = w.assembly.id;
    const entry = byAssembly.get(key) ?? { id: key, code: w.assembly.code, name: w.assembly.name, machine: w.assembly.machine.code, progress: [], status: [] };
    entry.progress.push(w.progress);
    entry.status.push(w.status);
    byAssembly.set(key, entry);
  }

  return {
    kpis: {
      activeProjects: projects.filter((p) => p.status === "ACTIVE").length,
      openTasks,
      assemblyProgress: average(workOrders.map((w) => w.progress)),
      openQualityIssues: openIssues.length,
      overdueTasks,
      completedWorkOrders: workOrders.filter((w) => w.status === "COMPLETED").length,
      totalWorkOrders: workOrders.length,
      criticalIssues: openIssues.filter((i) => i.severity === "CRITICAL").length,
    },
    projects: projects.filter((p) => p.status !== "ARCHIVED"),
    taskStatus,
    myTasks,
    openIssues: openIssues.slice(0, 5),
    activities,
    assemblies: [...byAssembly.values()].map((a) => ({ ...a, progress: average(a.progress) })),
    activeWorkOrders,
  };
}
