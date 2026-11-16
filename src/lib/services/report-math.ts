/** Pure reporting helpers (unit-tested). */

export function mean(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/** ISO-like week buckets (Monday start) between from and to. */
export function weekBuckets(from: Date, to: Date): { start: Date; label: string }[] {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const out: { start: Date; label: string }[] = [];
  for (let d = new Date(start); d <= to; d.setDate(d.getDate() + 7)) {
    out.push({ start: new Date(d), label: `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.` });
  }
  return out;
}

export function bucketCounts(dates: (Date | null | undefined)[], buckets: { start: Date }[]): number[] {
  const counts = buckets.map(() => 0);
  for (const d of dates) {
    if (!d) continue;
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (d >= buckets[i]!.start) {
        const end = buckets[i + 1]?.start;
        if (!end || d < end) counts[i]! += 1;
        break;
      }
    }
  }
  return counts;
}

export function ratePercent(part: number, total: number): number | null {
  if (!total) return null;
  return Math.round((part / total) * 1000) / 10;
}
