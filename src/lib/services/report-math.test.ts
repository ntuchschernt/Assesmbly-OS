import { describe, expect, it } from "vitest";
import { bucketCounts, mean, ratePercent, weekBuckets } from "./report-math";

describe("report math", () => {
  it("mean / ratePercent", () => {
    expect(mean([])).toBeNull();
    expect(mean([1, 2])).toBe(1.5);
    expect(ratePercent(1, 3)).toBe(33.3);
    expect(ratePercent(1, 0)).toBeNull();
  });
  it("week buckets start on Monday and count dates", () => {
    const buckets = weekBuckets(new Date(2026, 10, 4), new Date(2026, 10, 18)); // Wed 4 Nov → Wed 18 Nov
    expect(buckets[0]!.start.getDay()).toBe(1);
    expect(buckets).toHaveLength(3);
    const counts = bucketCounts([new Date(2026, 10, 3), new Date(2026, 10, 10), new Date(2026, 10, 11), null], buckets);
    expect(counts).toEqual([1, 2, 0]);
  });
});
