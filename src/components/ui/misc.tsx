import * as React from "react";
import Link from "next/link";
import { cn, initials } from "@/lib/utils";

export function Avatar({ name, size = "sm", className }: { name?: string | null; size?: "xs" | "sm" | "md"; className?: string }) {
  const sizes = { xs: "size-5 text-[9px]", sm: "size-6 text-2xs", md: "size-8 text-xs" };
  if (!name) {
    return <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-subtle", sizes[size], className)}>?</span>;
  }
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border border-border-strong bg-elevated font-semibold text-fg",
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

export function UserChip({ name }: { name?: string | null }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <Avatar name={name} size="xs" />
      <span className={cn("truncate", !name && "text-subtle")}>{name ?? "Nicht zugewiesen"}</span>
    </span>
  );
}

export function Progress({ value, className, tone = "orange" }: { value: number; className?: string; tone?: "orange" | "success" | "warning" | "danger" }) {
  const colors = { orange: "bg-primary", success: "bg-success", warning: "bg-warning", danger: "bg-danger" };
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-elevated", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-[width]", colors[tone])} style={{ width: `${v}%` }} />
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-grid flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center", className)}>
      {icon && <div className="mb-3 rounded-md border border-border bg-surface p-2.5 text-muted [&_svg]:size-5">{icon}</div>}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-elevated", className)} />;
}

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {meta && <div className="mb-2 flex flex-wrap items-center gap-2">{meta}</div>}
        <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SegmentedLinks({ items, active }: { items: { href: string; label: string; key: string; icon?: React.ReactNode }[]; active: string }) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors [&_svg]:size-3.5",
            active === item.key ? "bg-elevated text-fg shadow-sm" : "text-muted hover:text-fg",
          )}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </div>
  );
}

export function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="min-w-0 text-right">{children}</span>
    </div>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="label-caps">{children}</h2>
      {action}
    </div>
  );
}

export function EntityLink({ href, code, children }: { href: string; code?: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group inline-flex min-w-0 items-center gap-2 hover:text-primary">
      {code && <span className="shrink-0 font-mono text-2xs text-subtle group-hover:text-primary/80">{code}</span>}
      <span className="truncate">{children}</span>
    </Link>
  );
}
