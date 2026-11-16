import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFmt = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(d?: Date | string | null): string {
  if (!d) return "—";
  return dateFmt.format(new Date(d));
}

export function formatDateTime(d?: Date | string | null): string {
  if (!d) return "—";
  return dateTimeFmt.format(new Date(d));
}

export function toDateInput(d?: Date | string | null): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}

export function relativeTime(d: Date | string, now: Date = new Date()): string {
  const diff = (now.getTime() - new Date(d).getTime()) / 1000;
  const abs = Math.abs(diff);
  const future = diff < 0;
  const fmt = (v: number, unit: string) => (future ? `in ${v} ${unit}` : `vor ${v} ${unit}`);
  if (abs < 60) return future ? "gleich" : "gerade eben";
  if (abs < 3600) return fmt(Math.round(abs / 60), "Min.");
  if (abs < 86400) return fmt(Math.round(abs / 3600), "Std.");
  if (abs < 86400 * 30) {
    const days = Math.round(abs / 86400);
    return fmt(days, days === 1 ? "Tag" : "Tagen");
  }
  return formatDate(d);
}

export function isOverdue(due?: Date | string | null, done = false, now: Date = new Date()): boolean {
  if (!due || done) return false;
  const end = new Date(due);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < now.getTime();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1).replace(".", ",")} h`;
}

/** Splits a comma/newline separated string into a trimmed, de-duplicated list. */
export function splitList(value: string | null | undefined): string[] {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}
