/**
 * Business rules of the work order lifecycle (pure, unit-tested).
 */
import type { WorkOrderStatus } from "@prisma/client";

export const WORK_ORDER_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  PLANNED: ["RELEASED"],
  RELEASED: ["PLANNED", "IN_PROGRESS"],
  IN_PROGRESS: ["PAUSED", "COMPLETED"],
  PAUSED: ["IN_PROGRESS"],
  COMPLETED: [],
};

export type TransitionCheck = {
  from: WorkOrderStatus;
  to: WorkOrderStatus;
  hasInstruction: boolean;
  hasPublishedInstruction: boolean;
  totalSteps: number;
  doneSteps: number;
  failedSteps: number;
};

/** Returns an error message if the transition is not allowed, otherwise null. */
export function checkWorkOrderTransition(c: TransitionCheck): string | null {
  if (!WORK_ORDER_TRANSITIONS[c.from].includes(c.to)) return `Statuswechsel ${c.from} → ${c.to} ist nicht erlaubt.`;
  if (c.to === "IN_PROGRESS" && c.hasInstruction && !c.hasPublishedInstruction) {
    return "Start nicht möglich: Die verknüpfte Montageanweisung ist nicht veröffentlicht.";
  }
  if (c.to === "COMPLETED") {
    if (c.failedSteps > 0) return `Abschluss nicht möglich: ${c.failedSteps} Arbeitsschritt(e) mit Ergebnis „nicht i.O.“.`;
    if (c.totalSteps > 0 && c.doneSteps < c.totalSteps) return `Abschluss nicht möglich: ${c.totalSteps - c.doneSteps} Arbeitsschritt(e) offen.`;
  }
  return null;
}
