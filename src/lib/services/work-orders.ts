import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getPublishedRevisions } from "./instructions";
import { workOrderProgress } from "./progress";

const workOrderInclude = {
  assembly: { select: { id: true, code: true, name: true, machine: { select: { id: true, code: true, name: true, project: { select: { id: true, key: true, name: true } } } } } },
  assignee: { select: { id: true, name: true } },
  workInstruction: { select: { id: true, number: true, title: true, status: true, version: true } },
  timeEntries: { select: { minutes: true } },
  stepExecutions: { select: { stepId: true, status: true, version: true } },
  _count: { select: { qualityIssues: true, tasks: true } },
} satisfies Prisma.WorkOrderInclude;

export type WorkOrderWithProgress = Awaited<ReturnType<typeof listWorkOrders>>[number];

/** Work orders of the workspace enriched with logged time, published step count and progress. */
export async function listWorkOrders(workspaceId: string, where: Prisma.WorkOrderWhereInput = {}) {
  const orders = await db.workOrder.findMany({
    where: { assembly: { machine: { project: { workspaceId } } }, ...where },
    include: workOrderInclude,
    orderBy: { number: "asc" },
  });
  const published = await getPublishedRevisions(orders.map((o) => o.workInstructionId).filter((x): x is string => !!x));
  return orders.map((o) => {
    const rev = o.workInstructionId ? published.get(o.workInstructionId) : undefined;
    const stepIds = new Set(rev?.snapshot.steps.map((s) => s.id) ?? []);
    const doneSteps = o.stepExecutions.filter((e) => e.status === "DONE" && stepIds.has(e.stepId)).length;
    const loggedMinutes = o.timeEntries.reduce((a, t) => a + t.minutes, 0);
    const totalSteps = stepIds.size;
    return {
      ...o,
      loggedMinutes,
      totalSteps,
      doneSteps,
      publishedVersion: rev?.version ?? null,
      progress: workOrderProgress({ status: o.status, plannedHours: o.plannedHours, loggedMinutes, totalSteps, doneSteps }),
    };
  });
}
