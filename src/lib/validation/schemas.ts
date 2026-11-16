/**
 * Central validation for all write operations. Server actions parse every input with these
 * schemas; client forms reuse the same field names to show field errors.
 */
import { z } from "zod";
import { optionalDate, optionalId, optionalText, priority, requiredText, stringList } from "./common";

// ---------------------------------------------------------------- Projects
export const projectSchema = z
  .object({
    name: requiredText("Projektname", 120),
    key: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z][A-Z0-9]{1,5}$/, "2–6 Zeichen, Großbuchstaben/Ziffern, beginnt mit Buchstabe"),
    customer: optionalText(120),
    description: optionalText(4000),
    status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]),
    priority,
    ownerId: optionalId,
    startDate: optionalDate,
    endDate: optionalDate,
  })
  .refine((p) => !p.startDate || !p.endDate || p.endDate >= p.startDate, {
    message: "Enddatum muss nach dem Startdatum liegen",
    path: ["endDate"],
  });
export type ProjectInput = z.input<typeof projectSchema>;

// ---------------------------------------------------------------- Tasks
export const taskStatus = z.enum(["OPEN", "IN_PROGRESS", "REVIEW", "BLOCKED", "DONE"]);
export const taskSchema = z.object({
  title: requiredText("Titel", 200),
  description: optionalText(8000),
  status: taskStatus,
  priority,
  assigneeId: optionalId,
  dueDate: optionalDate,
  labels: stringList,
  projectId: optionalId,
  assemblyId: optionalId,
  workOrderId: optionalId,
});
export type TaskInput = z.input<typeof taskSchema>;

export const moveTaskSchema = z.object({
  id: z.string().min(1),
  status: taskStatus,
  /** id of the task the moved card is placed before (null = end of column) */
  beforeId: z.string().nullable().optional(),
});

export const commentSchema = z.object({ taskId: z.string().min(1), body: requiredText("Kommentar", 4000) });

// ---------------------------------------------------------------- Assembly
export const machineSchema = z.object({
  projectId: z.string().min(1, "Projekt ist erforderlich"),
  code: requiredText("Kennung", 30),
  name: requiredText("Name", 120),
  serialNumber: optionalText(60),
  description: optionalText(2000),
  status: z.enum(["PLANNED", "IN_ASSEMBLY", "TESTING", "COMPLETED"]),
});

export const assemblySchema = z.object({
  machineId: z.string().min(1, "Maschine ist erforderlich"),
  parentId: optionalId,
  code: requiredText("Sachnummer", 30),
  name: requiredText("Name", 120),
  description: optionalText(2000),
  status: z.enum(["PLANNED", "IN_PROGRESS", "BLOCKED", "COMPLETED"]),
  responsibleId: optionalId,
});

export const workOrderSchema = z.object({
  assemblyId: z.string().min(1, "Baugruppe ist erforderlich"),
  workInstructionId: optionalId,
  title: requiredText("Titel", 200),
  description: optionalText(4000),
  priority,
  assigneeId: optionalId,
  plannedHours: z.coerce.number({ invalid_type_error: "Zahl erwartet" }).min(0, "Muss ≥ 0 sein").max(10000),
  dueDate: optionalDate,
});

export const workOrderStatusSchema = z.enum(["PLANNED", "RELEASED", "IN_PROGRESS", "PAUSED", "COMPLETED"]);

export const timeEntrySchema = z.object({
  workOrderId: z.string().min(1),
  minutes: z.coerce.number().int("Ganze Minuten").min(5, "Mindestens 5 Minuten").max(24 * 60, "Maximal 24 Stunden"),
  note: optionalText(500),
  date: optionalDate,
});

export const stepExecutionSchema = z.object({
  workOrderId: z.string().min(1),
  stepId: z.string().min(1),
  status: z.enum(["PENDING", "DONE", "FAILED"]),
  resultNote: optionalText(1000),
});

// ---------------------------------------------------------------- Work instructions
export const instructionSchema = z.object({
  title: requiredText("Titel", 200),
  description: optionalText(4000),
  assemblyId: optionalId,
  tools: stringList,
  materials: stringList,
  safetyNotes: optionalText(4000),
  imageUrls: stringList,
});

export const stepSchema = z.object({
  id: z.string().optional(),
  title: requiredText("Schrittname", 200),
  description: requiredText("Beschreibung", 4000),
  tools: stringList,
  parts: stringList,
  expectedResult: optionalText(1000),
  isCheckpoint: z.boolean().default(false),
  safetyCritical: z.boolean().default(false),
  imageUrl: optionalText(500),
  responsibleId: optionalId,
});

export const instructionWithStepsSchema = instructionSchema.extend({ steps: z.array(stepSchema).max(100) });
export type InstructionInput = z.input<typeof instructionWithStepsSchema>;

export const instructionTransitionSchema = z.object({
  id: z.string().min(1),
  to: z.enum(["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED"]),
  note: optionalText(500),
});

// ---------------------------------------------------------------- Documents
export const documentType = z.enum(["PDF", "DRAWING", "IMAGE", "WORK_INSTRUCTION", "INSPECTION_REPORT", "BOM"]);
export const documentSchema = z.object({
  title: requiredText("Titel", 200),
  description: optionalText(4000),
  type: documentType,
  category: optionalText(80),
  tags: stringList,
  projectId: optionalId,
  assemblyId: optionalId,
});
export const documentStatusSchema = z.enum(["DRAFT", "REVIEW", "APPROVED", "ARCHIVED"]);

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const ALLOWED_MIME_PREFIXES = ["application/pdf", "image/", "text/", "application/vnd.openxmlformats", "application/vnd.ms-excel", "application/acad", "application/dxf", "application/octet-stream", "application/zip", "application/json"];

// ---------------------------------------------------------------- Quality
export const qualityStatus = z.enum(["NEW", "INVESTIGATING", "ACTION_REQUIRED", "IN_REVIEW", "RESOLVED", "CLOSED"]);
export const qualitySchema = z.object({
  title: requiredText("Titel", 200),
  description: requiredText("Beschreibung", 8000),
  type: z.enum(["DEFECT", "DEVIATION", "INSPECTION", "COMPLAINT"]),
  severity: z.enum(["MINOR", "MAJOR", "CRITICAL"]),
  rootCause: optionalText(4000),
  assigneeId: optionalId,
  dueDate: optionalDate,
  projectId: optionalId,
  machineId: optionalId,
  assemblyId: optionalId,
  workOrderId: optionalId,
  taskId: optionalId,
  documentId: optionalId,
});
export type QualityInput = z.input<typeof qualitySchema>;

export const qualityActionSchema = z.object({
  issueId: z.string().min(1),
  title: requiredText("Maßnahme", 300),
  type: z.enum(["CONTAINMENT", "CORRECTIVE", "PREVENTIVE", "VERIFICATION"]),
  assigneeId: optionalId,
  dueDate: optionalDate,
});
