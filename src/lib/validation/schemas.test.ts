import { describe, expect, it } from "vitest";
import { projectSchema, qualitySchema, taskSchema, timeEntrySchema } from "./schemas";

describe("projectSchema", () => {
  const valid = { name: "Anlage", key: "ab1", status: "ACTIVE", priority: "HIGH", startDate: "2026-01-01", endDate: "2026-02-01" };
  it("normalizes key and parses dates", () => {
    const r = projectSchema.parse(valid);
    expect(r.key).toBe("AB1");
    expect(r.startDate).toBeInstanceOf(Date);
    expect(r.ownerId).toBeNull();
  });
  it("rejects end before start and invalid keys", () => {
    expect(projectSchema.safeParse({ ...valid, endDate: "2025-01-01" }).success).toBe(false);
    expect(projectSchema.safeParse({ ...valid, key: "1A" }).success).toBe(false);
  });
});

describe("taskSchema", () => {
  it("splits labels and maps empty selects to null", () => {
    const r = taskSchema.parse({ title: " Test ", status: "OPEN", priority: "LOW", labels: "Montage, Qualität, Montage", assigneeId: "", dueDate: "" });
    expect(r.title).toBe("Test");
    expect(r.labels).toEqual(["Montage", "Qualität"]);
    expect(r.assigneeId).toBeNull();
    expect(r.dueDate).toBeNull();
  });
  it("requires a title", () => {
    expect(taskSchema.safeParse({ title: "  ", status: "OPEN", priority: "LOW" }).success).toBe(false);
  });
});

describe("other schemas", () => {
  it("quality issue needs description", () => {
    expect(qualitySchema.safeParse({ title: "x", description: "", type: "DEFECT", severity: "MAJOR" }).success).toBe(false);
  });
  it("time entries are bounded", () => {
    expect(timeEntrySchema.safeParse({ workOrderId: "w", minutes: 2 }).success).toBe(false);
    expect(timeEntrySchema.safeParse({ workOrderId: "w", minutes: "90" }).success).toBe(true);
  });
});
