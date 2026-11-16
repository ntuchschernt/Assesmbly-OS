import type { Priority } from "@prisma/client";
import { PRIORITY } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Compact priority marker: signal bars like an industrial level indicator. */
export function PriorityIndicator({ priority, showLabel = true }: { priority: Priority; showLabel?: boolean }) {
  const meta = PRIORITY[priority];
  const color = { LOW: "bg-subtle", MEDIUM: "bg-info", HIGH: "bg-warning", CRITICAL: "bg-danger" }[priority];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" title={`Priorität: ${meta.label}`}>
      <span className="flex items-end gap-[2px]">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("w-[3px] rounded-sm", i <= meta.rank ? color : "bg-border-strong")} style={{ height: 4 + i * 2 }} />
        ))}
      </span>
      {showLabel && meta.label}
    </span>
  );
}
