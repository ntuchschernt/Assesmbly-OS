/**
 * Pure helpers for immutable work-instruction snapshots (no DB access).
 * Production views (released + execution) render ONLY from these snapshots.
 */
import type { InstructionStatus } from "@prisma/client";

export type SnapshotStep = {
  id: string;
  order: number;
  title: string;
  description: string;
  tools: string[];
  parts: string[];
  expectedResult: string | null;
  isCheckpoint: boolean;
  safetyCritical: boolean;
  imageUrl: string | null;
  responsibleName: string | null;
};

export type InstructionSnapshot = {
  number: string;
  title: string;
  description: string | null;
  version: number;
  tools: string[];
  materials: string[];
  safetyNotes: string | null;
  imageUrls: string[];
  assembly: { id: string; code: string; name: string } | null;
  approvedByName: string | null;
  approvedAt: string | null;
  steps: SnapshotStep[];
};

type InstructionLike = {
  number: string;
  title: string;
  description: string | null;
  version: number;
  tools: string[];
  materials: string[];
  safetyNotes: string | null;
  imageUrls: string[];
  assembly?: { id: string; code: string; name: string } | null;
  approvedBy?: { name: string } | null;
  approvedAt?: Date | null;
  steps: Array<{
    id: string;
    order: number;
    title: string;
    description: string;
    tools: string[];
    parts: string[];
    expectedResult: string | null;
    isCheckpoint: boolean;
    safetyCritical: boolean;
    imageUrl: string | null;
    responsible?: { name: string } | null;
  }>;
};

export function buildSnapshot(wi: InstructionLike): InstructionSnapshot {
  return {
    number: wi.number,
    title: wi.title,
    description: wi.description,
    version: wi.version,
    tools: wi.tools,
    materials: wi.materials,
    safetyNotes: wi.safetyNotes,
    imageUrls: wi.imageUrls,
    assembly: wi.assembly ? { id: wi.assembly.id, code: wi.assembly.code, name: wi.assembly.name } : null,
    approvedByName: wi.approvedBy?.name ?? null,
    approvedAt: wi.approvedAt ? wi.approvedAt.toISOString() : null,
    steps: [...wi.steps]
      .sort((a, b) => a.order - b.order)
      .map((s) => ({
        id: s.id,
        order: s.order,
        title: s.title,
        description: s.description,
        tools: s.tools,
        parts: s.parts,
        expectedResult: s.expectedResult,
        isCheckpoint: s.isCheckpoint,
        safetyCritical: s.safetyCritical,
        imageUrl: s.imageUrl,
        responsibleName: s.responsible?.name ?? null,
      })),
  };
}

/** Allowed status transitions of the review & release workflow. */
export const INSTRUCTION_TRANSITIONS: Record<InstructionStatus, InstructionStatus[]> = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["DRAFT", "APPROVED"],
  APPROVED: ["DRAFT", "PUBLISHED"],
  PUBLISHED: [],
};

/** Transitions that require an approver role (human release decision). */
export const APPROVAL_TRANSITIONS: InstructionStatus[] = ["APPROVED", "PUBLISHED"];

export function canTransition(from: InstructionStatus, to: InstructionStatus): boolean {
  return INSTRUCTION_TRANSITIONS[from].includes(to);
}

/** Validation before submitting for review. Returns human readable problems. */
export function reviewReadinessProblems(wi: { title: string; steps: { title: string; description: string }[] }): string[] {
  const problems: string[] = [];
  if (!wi.title.trim()) problems.push("Titel fehlt.");
  if (wi.steps.length === 0) problems.push("Mindestens ein Arbeitsschritt ist erforderlich.");
  wi.steps.forEach((s, i) => {
    if (!s.title.trim() || !s.description.trim()) problems.push(`Schritt ${i + 1} benötigt Name und Beschreibung.`);
  });
  return problems;
}
