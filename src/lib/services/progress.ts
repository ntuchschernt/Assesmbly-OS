/**
 * Pure progress calculations – shared by dashboard, project, assembly and reporting views.
 * Kept free of DB access so they are unit-testable.
 */
import type { WorkOrderStatus } from "@prisma/client";

export type WorkOrderProgressInput = {
  status: WorkOrderStatus;
  plannedHours: number;
  loggedMinutes: number;
  totalSteps: number;
  doneSteps: number;
};

/**
 * Progress of a work order in percent:
 * - COMPLETED → 100
 * - with a published instruction → share of executed steps
 * - without steps: PLANNED/RELEASED → 0, otherwise logged time vs. planned time (capped at 90 %,
 *   because time alone never proves completion)
 */
export function workOrderProgress(wo: WorkOrderProgressInput): number {
  if (wo.status === "COMPLETED") return 100;
  if (wo.totalSteps > 0) return Math.round((Math.min(wo.doneSteps, wo.totalSteps) / wo.totalSteps) * 100);
  if (wo.status === "PLANNED" || wo.status === "RELEASED") return 0;
  if (wo.plannedHours <= 0) return 0;
  return Math.min(90, Math.round((wo.loggedMinutes / 60 / wo.plannedHours) * 100));
}

/** Average of a list of percentages (0 when empty). */
export function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

/**
 * Project progress: equally weighted task completion and assembly progress.
 * If one dimension has no data, the other one is used alone. Completed projects are 100.
 */
export function projectProgress(input: { status: string; tasksDone: number; tasksTotal: number; workOrderProgress: number[] }): number {
  if (input.status === "COMPLETED") return 100;
  const parts: number[] = [];
  if (input.tasksTotal > 0) parts.push((input.tasksDone / input.tasksTotal) * 100);
  if (input.workOrderProgress.length > 0) parts.push(average(input.workOrderProgress));
  return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
}

/** Cycle time in days between two dates (null if incomplete). */
export function cycleDays(start?: Date | null, end?: Date | null): number | null {
  if (!start || !end) return null;
  return Math.max(0, Math.round(((end.getTime() - start.getTime()) / 86_400_000) * 10) / 10);
}
