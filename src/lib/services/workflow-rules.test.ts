import { describe, expect, it } from "vitest";
import { buildSnapshot, canTransition, reviewReadinessProblems } from "./instruction-snapshot";
import { checkWorkOrderTransition } from "./work-order-rules";

describe("work instruction workflow", () => {
  it("only allows the defined release path", () => {
    expect(canTransition("DRAFT", "IN_REVIEW")).toBe(true);
    expect(canTransition("DRAFT", "PUBLISHED")).toBe(false);
    expect(canTransition("DRAFT", "APPROVED")).toBe(false);
    expect(canTransition("IN_REVIEW", "APPROVED")).toBe(true);
    expect(canTransition("APPROVED", "PUBLISHED")).toBe(true);
    expect(canTransition("PUBLISHED", "DRAFT")).toBe(false);
  });
  it("requires title and complete steps before review", () => {
    expect(reviewReadinessProblems({ title: "X", steps: [] })).toHaveLength(1);
    expect(reviewReadinessProblems({ title: "X", steps: [{ title: "a", description: "" }] })[0]).toMatch(/Schritt 1/);
    expect(reviewReadinessProblems({ title: "X", steps: [{ title: "a", description: "b" }] })).toEqual([]);
  });
  it("snapshots steps in order and keeps step ids", () => {
    const snap = buildSnapshot({
      number: "WI-1", title: "T", description: null, version: 3, tools: [], materials: [], safetyNotes: null, imageUrls: [],
      steps: [
        { id: "b", order: 2, title: "two", description: "d", tools: [], parts: [], expectedResult: null, isCheckpoint: false, safetyCritical: false, imageUrl: null },
        { id: "a", order: 1, title: "one", description: "d", tools: [], parts: [], expectedResult: "ok", isCheckpoint: true, safetyCritical: false, imageUrl: null, responsible: { name: "R" } },
      ],
    });
    expect(snap.version).toBe(3);
    expect(snap.steps.map((s) => s.id)).toEqual(["a", "b"]);
    expect(snap.steps[0]!.responsibleName).toBe("R");
  });
});

describe("work order transitions", () => {
  const base = { hasInstruction: true, hasPublishedInstruction: true, totalSteps: 3, doneSteps: 3, failedSteps: 0 };
  it("blocks start without a published instruction", () => {
    expect(checkWorkOrderTransition({ ...base, from: "RELEASED", to: "IN_PROGRESS", hasPublishedInstruction: false })).toMatch(/nicht veröffentlicht/);
  });
  it("allows start without any instruction", () => {
    expect(checkWorkOrderTransition({ ...base, from: "RELEASED", to: "IN_PROGRESS", hasInstruction: false, hasPublishedInstruction: false })).toBeNull();
  });
  it("blocks completion with open or failed steps", () => {
    expect(checkWorkOrderTransition({ ...base, from: "IN_PROGRESS", to: "COMPLETED", doneSteps: 2 })).toMatch(/offen/);
    expect(checkWorkOrderTransition({ ...base, from: "IN_PROGRESS", to: "COMPLETED", doneSteps: 2, failedSteps: 1 })).toMatch(/nicht i\.O\./);
    expect(checkWorkOrderTransition({ ...base, from: "IN_PROGRESS", to: "COMPLETED" })).toBeNull();
  });
  it("rejects undefined transitions", () => {
    expect(checkWorkOrderTransition({ ...base, from: "COMPLETED", to: "IN_PROGRESS" })).toMatch(/nicht erlaubt/);
    expect(checkWorkOrderTransition({ ...base, from: "PLANNED", to: "COMPLETED" })).toMatch(/nicht erlaubt/);
  });
});
