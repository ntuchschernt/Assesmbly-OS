import * as React from "react";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/constants";

const tones: Record<Tone, string> = {
  neutral: "bg-elevated text-fg/90 border-border-strong",
  orange: "bg-primary/12 text-primary border-primary/30",
  success: "bg-success/12 text-success border-success/30",
  warning: "bg-warning/12 text-warning border-warning/30",
  danger: "bg-danger/12 text-danger border-danger/30",
  info: "bg-info/12 text-info border-info/30",
  muted: "bg-transparent text-subtle border-border",
};

const dots: Record<Tone, string> = {
  neutral: "bg-muted",
  orange: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  muted: "bg-subtle",
};

export function Badge({
  tone = "neutral",
  dot,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded border px-1.5 text-2xs font-medium",
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", dots[tone])} />}
      {children}
    </span>
  );
}

/** Renders a badge from a constants map entry, e.g. <StatusBadge meta={TASK_STATUS[task.status]} /> */
export function StatusBadge({ meta, className }: { meta: { label: string; tone: Tone }; className?: string }) {
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 items-center rounded bg-elevated px-1.5 font-mono text-2xs text-muted">
      {children}
    </span>
  );
}
