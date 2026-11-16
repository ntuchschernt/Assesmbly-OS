/**
 * Single source of truth for enum labels and visual tones.
 * UI components never hardcode status labels or colors.
 */
import type {
  AssemblyStatus,
  DocumentStatus,
  DocumentType,
  InstructionStatus,
  MachineStatus,
  Priority,
  ProjectStatus,
  QualityActionType,
  QualityIssueType,
  QualityStatus,
  Severity,
  TaskStatus,
  UserRole,
  WorkOrderStatus,
} from "@prisma/client";

export type Tone = "neutral" | "orange" | "success" | "warning" | "danger" | "info" | "muted";

type Meta = { label: string; tone: Tone };

export const PROJECT_STATUS: Record<ProjectStatus, Meta> = {
  PLANNING: { label: "Planning", tone: "info" },
  ACTIVE: { label: "Active", tone: "orange" },
  ON_HOLD: { label: "On Hold", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
  ARCHIVED: { label: "Archived", tone: "muted" },
};

export const PRIORITY: Record<Priority, Meta & { rank: number }> = {
  LOW: { label: "Low", tone: "muted", rank: 0 },
  MEDIUM: { label: "Medium", tone: "info", rank: 1 },
  HIGH: { label: "High", tone: "warning", rank: 2 },
  CRITICAL: { label: "Critical", tone: "danger", rank: 3 },
};

export const TASK_STATUS: Record<TaskStatus, Meta> = {
  OPEN: { label: "Open", tone: "neutral" },
  IN_PROGRESS: { label: "In Progress", tone: "orange" },
  REVIEW: { label: "Review", tone: "info" },
  BLOCKED: { label: "Blocked", tone: "danger" },
  DONE: { label: "Done", tone: "success" },
};
export const TASK_STATUS_ORDER: TaskStatus[] = ["OPEN", "IN_PROGRESS", "REVIEW", "BLOCKED", "DONE"];

export const MACHINE_STATUS: Record<MachineStatus, Meta> = {
  PLANNED: { label: "Planned", tone: "neutral" },
  IN_ASSEMBLY: { label: "In Assembly", tone: "orange" },
  TESTING: { label: "Testing", tone: "info" },
  COMPLETED: { label: "Completed", tone: "success" },
};

export const ASSEMBLY_STATUS: Record<AssemblyStatus, Meta> = {
  PLANNED: { label: "Planned", tone: "neutral" },
  IN_PROGRESS: { label: "In Progress", tone: "orange" },
  BLOCKED: { label: "Blocked", tone: "danger" },
  COMPLETED: { label: "Completed", tone: "success" },
};

export const WORK_ORDER_STATUS: Record<WorkOrderStatus, Meta> = {
  PLANNED: { label: "Planned", tone: "neutral" },
  RELEASED: { label: "Released", tone: "info" },
  IN_PROGRESS: { label: "In Progress", tone: "orange" },
  PAUSED: { label: "Paused", tone: "warning" },
  COMPLETED: { label: "Completed", tone: "success" },
};

export const INSTRUCTION_STATUS: Record<InstructionStatus, Meta> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  IN_REVIEW: { label: "In Review", tone: "warning" },
  APPROVED: { label: "Approved", tone: "info" },
  PUBLISHED: { label: "Published", tone: "success" },
};

export const DOCUMENT_STATUS: Record<DocumentStatus, Meta> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  REVIEW: { label: "Review", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  ARCHIVED: { label: "Archived", tone: "muted" },
};

export const DOCUMENT_TYPE: Record<DocumentType, { label: string }> = {
  PDF: { label: "PDF" },
  DRAWING: { label: "Technische Zeichnung" },
  IMAGE: { label: "Bild" },
  WORK_INSTRUCTION: { label: "Montageanweisung" },
  INSPECTION_REPORT: { label: "Prüfprotokoll" },
  BOM: { label: "Stückliste" },
};

export const QUALITY_STATUS: Record<QualityStatus, Meta> = {
  NEW: { label: "New", tone: "info" },
  INVESTIGATING: { label: "Investigating", tone: "orange" },
  ACTION_REQUIRED: { label: "Action Required", tone: "danger" },
  IN_REVIEW: { label: "In Review", tone: "warning" },
  RESOLVED: { label: "Resolved", tone: "success" },
  CLOSED: { label: "Closed", tone: "muted" },
};
export const QUALITY_STATUS_ORDER: QualityStatus[] = [
  "NEW",
  "INVESTIGATING",
  "ACTION_REQUIRED",
  "IN_REVIEW",
  "RESOLVED",
  "CLOSED",
];
export const QUALITY_OPEN_STATUSES: QualityStatus[] = ["NEW", "INVESTIGATING", "ACTION_REQUIRED", "IN_REVIEW"];

export const QUALITY_TYPE: Record<QualityIssueType, { label: string }> = {
  DEFECT: { label: "Fehler" },
  DEVIATION: { label: "Abweichung" },
  INSPECTION: { label: "Prüfbefund" },
  COMPLAINT: { label: "Reklamation" },
};

export const SEVERITY: Record<Severity, Meta> = {
  MINOR: { label: "Minor", tone: "info" },
  MAJOR: { label: "Major", tone: "warning" },
  CRITICAL: { label: "Critical", tone: "danger" },
};

export const QUALITY_ACTION_TYPE: Record<QualityActionType, { label: string }> = {
  CONTAINMENT: { label: "Sofortmaßnahme" },
  CORRECTIVE: { label: "Korrekturmaßnahme" },
  PREVENTIVE: { label: "Vorbeugemaßnahme" },
  VERIFICATION: { label: "Prüfung / Verifikation" },
};

export const USER_ROLE: Record<UserRole, { label: string }> = {
  ADMIN: { label: "Administrator" },
  PROJECT_MANAGER: { label: "Projektleitung" },
  ENGINEER: { label: "Konstruktion / Engineering" },
  TECHNICIAN: { label: "Montagetechniker" },
  QUALITY: { label: "Qualitätsmanagement" },
};

/** Roles allowed to approve/publish technical content (work instructions, documents). */
export const APPROVER_ROLES: UserRole[] = ["ADMIN", "PROJECT_MANAGER", "ENGINEER", "QUALITY"];

export function options<T extends string>(map: Record<T, { label: string }>) {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value].label }));
}
