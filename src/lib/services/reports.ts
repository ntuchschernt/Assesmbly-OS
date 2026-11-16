import "server-only";
import { db } from "@/lib/db";
import { listProjects } from "./projects";
import { listWorkOrders } from "./work-orders";
import { average, cycleDays } from "./progress";
import { bucketCounts, mean, ratePercent, weekBuckets } from "./report-math";

export const PERIODS = { "30": "Letzte 30 Tage", "90": "Letzte 90 Tage", "180": "Letzte 180 Tage", "365": "Letzte 12 Monate", all: "Gesamter Zeitraum" } as const;
export type Period = keyof typeof PERIODS;

export async function getReport(workspaceId: string, opts: { projectId?: string; period: Period }, now = new Date()) {
  const from = opts.period === "all" ? null : new Date(now.getTime() - Number(opts.period) * 86_400_000);
  const inPeriod = from ? { gte: from } : undefined;
  const projectWhere = opts.projectId ? { projectId: opts.projectId } : {};

  const [projects, workOrders, tasks, issues, steps] = await Promise.all([
    listProjects(workspaceId, { status: "ALL" }),
    listWorkOrders(workspaceId, opts.projectId ? { assembly: { machine: { projectId: opts.projectId } } } : {}),
    db.task.findMany({ where: { workspaceId, ...projectWhere, ...(inPeriod ? { OR: [{ createdAt: inPeriod }, { completedAt: inPeriod }] } : {}) } }),
    db.qualityIssue.findMany({ where: { workspaceId, ...projectWhere, ...(inPeriod ? { createdAt: inPeriod } : {}) } }),
    db.stepExecution.findMany({ where: { workOrder: { assembly: { machine: { project: { workspaceId, ...(opts.projectId ? { id: opts.projectId } : {}) } } } }, status: { not: "PENDING" }, ...(inPeriod ? { completedAt: inPeriod } : {}) } }),
  ]);

  const scopedProjects = projects.filter((p) => p.status !== "ARCHIVED" && (!opts.projectId || p.id === opts.projectId));
  const completedWos = workOrders.filter((w) => w.completedAt && (!from || w.completedAt >= from));
  const woWithIssues = new Set(issues.filter((i) => i.workOrderId).map((i) => i.workOrderId));
  const tasksDone = tasks.filter((t) => t.completedAt && (!from || t.completedAt >= from));
  const resolved = issues.filter((i) => i.resolvedAt);

  const trendFrom = from ?? new Date(Math.min(...[...tasks.map((t) => t.createdAt.getTime()), now.getTime() - 90 * 86_400_000]));
  const buckets = weekBuckets(trendFrom, now);
  const created = bucketCounts(tasks.map((t) => t.createdAt), buckets);
  const completed = bucketCounts(tasks.map((t) => t.completedAt), buckets);

  return {
    from,
    projects: scopedProjects.map((p) => ({ id: p.id, key: p.key, name: p.name, progress: p.progress, status: p.status })),
    assembly: {
      average: average(workOrders.map((w) => w.progress)),
      orders: workOrders.map((w) => ({ id: w.id, number: w.number, title: w.title, progress: w.progress, status: w.status, plannedHours: w.plannedHours, actualHours: Math.round((w.loggedMinutes / 60) * 10) / 10 })),
    },
    taskStatus: ["OPEN", "IN_PROGRESS", "REVIEW", "BLOCKED", "DONE"].map((s) => ({ status: s, count: tasks.filter((t) => t.status === s).length })),
    quality: {
      open: issues.filter((i) => !["RESOLVED", "CLOSED"].includes(i.status)).length,
      total: issues.length,
      bySeverity: ["CRITICAL", "MAJOR", "MINOR"].map((s) => ({ severity: s, open: issues.filter((i) => i.severity === s && !["RESOLVED", "CLOSED"].includes(i.status)).length, total: issues.filter((i) => i.severity === s).length })),
      byType: ["DEFECT", "DEVIATION", "INSPECTION", "COMPLAINT"].map((t) => ({ type: t, count: issues.filter((i) => i.type === t).length })),
    },
    errorRate: {
      workOrdersWithIssues: ratePercent(workOrders.filter((w) => woWithIssues.has(w.id)).length, workOrders.length),
      woAffected: workOrders.filter((w) => woWithIssues.has(w.id)).length,
      woTotal: workOrders.length,
      stepFailRate: ratePercent(steps.filter((s) => s.status === "FAILED").length, steps.length),
      stepsTotal: steps.length,
    },
    cycleTimes: {
      workOrderDays: mean(completedWos.map((w) => cycleDays(w.startedAt, w.completedAt)).filter((x): x is number => x !== null)),
      workOrderCount: completedWos.length,
      taskDays: mean(tasksDone.map((t) => cycleDays(t.createdAt, t.completedAt)).filter((x): x is number => x !== null)),
      taskCount: tasksDone.length,
      qualityDays: mean(resolved.map((i) => cycleDays(i.createdAt, i.resolvedAt)).filter((x): x is number => x !== null)),
      qualityCount: resolved.length,
    },
    trend: buckets.map((b, i) => ({ label: b.label, created: created[i]!, completed: completed[i]! })),
  };
}
