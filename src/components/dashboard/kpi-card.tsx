import Link from "next/link";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  unit,
  hint,
  icon,
  href,
  tone = "default",
}: {
  label: string;
  value: number | string;
  unit?: string;
  hint?: string;
  icon: React.ReactNode;
  href: string;
  tone?: "default" | "danger" | "warning" | "success";
}) {
  const accent = { default: "text-primary", danger: "text-danger", warning: "text-warning", success: "text-success" }[tone];
  return (
    <Link href={href} className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-elevated/40">
      <div className="flex items-start justify-between">
        <span className="label-caps pr-2">{label}</span>
        <span className={cn("[&_svg]:size-4", accent)}>{icon}</span>
      </div>
      <div className="mt-auto flex items-baseline gap-1 pt-3">
        <span className="font-mono text-3xl font-semibold tracking-tight text-fg">{value}</span>
        {unit && <span className="text-sm text-muted">{unit}</span>}
      </div>
      {hint && <p className="mt-1 truncate text-xs text-subtle">{hint}</p>}
      <span className={cn("absolute bottom-0 left-0 h-0.5 w-0 bg-current transition-all group-hover:w-full", accent)} />
    </Link>
  );
}
