import { describe, expect, it } from "vitest";
import { average, cycleDays, projectProgress, workOrderProgress } from "./progress";

describe("workOrderProgress", () => {
  it("is 100 for completed orders", () => {
    expect(workOrderProgress({ status: "COMPLETED", plannedHours: 10, loggedMinutes: 0, totalSteps: 4, doneSteps: 0 })).toBe(100);
  });
  it("uses executed steps when a published instruction exists", () => {
    expect(workOrderProgress({ status: "IN_PROGRESS", plannedHours: 10, loggedMinutes: 900, totalSteps: 4, doneSteps: 2 })).toBe(50);
  });
  it("is 0 for planned/released orders without steps", () => {
    expect(workOrderProgress({ status: "RELEASED", plannedHours: 10, loggedMinutes: 600, totalSteps: 0, doneSteps: 0 })).toBe(0);
  });
  it("estimates from time but never exceeds 90 % without steps", () => {
    expect(workOrderProgress({ status: "PAUSED", plannedHours: 8, loggedMinutes: 240, totalSteps: 0, doneSteps: 0 })).toBe(50);
    expect(workOrderProgress({ status: "IN_PROGRESS", plannedHours: 1, loggedMinutes: 600, totalSteps: 0, doneSteps: 0 })).toBe(90);
  });
});

describe("projectProgress", () => {
  it("averages task and assembly progress", () => {
    expect(projectProgress({ status: "ACTIVE", tasksDone: 1, tasksTotal: 4, workOrderProgress: [100, 50] })).toBe(50);
  });
  it("uses the available dimension only", () => {
    expect(projectProgress({ status: "ACTIVE", tasksDone: 1, tasksTotal: 2, workOrderProgress: [] })).toBe(50);
    expect(projectProgress({ status: "PLANNING", tasksDone: 0, tasksTotal: 0, workOrderProgress: [] })).toBe(0);
  });
  it("is 100 for completed projects", () => {
    expect(projectProgress({ status: "COMPLETED", tasksDone: 0, tasksTotal: 3, workOrderProgress: [] })).toBe(100);
  });
});

describe("helpers", () => {
  it("average rounds and handles empty input", () => {
    expect(average([])).toBe(0);
    expect(average([10, 20, 31])).toBe(20);
  });
  it("cycleDays", () => {
    expect(cycleDays(new Date("2026-01-01T00:00:00Z"), new Date("2026-01-03T12:00:00Z"))).toBe(2.5);
    expect(cycleDays(null, new Date())).toBeNull();
  });
});
