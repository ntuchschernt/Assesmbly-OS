import Link from "next/link";
import { Progress } from "@/components/ui/misc";

/** Horizontal progress list – used where a full chart would be overkill. */
export function BarList({
  items,
  empty = "Keine Daten",
}: {
  items: { id: string; label: string; sublabel?: string; value: number; href?: string; tone?: "orange" | "success" | "warning" | "danger"; right?: React.ReactNode }[];
  empty?: string;
}) {
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-3.5">
      {items.map((i) => {
        const label = (
          <span className="min-w-0 truncate text-sm">
            {i.sublabel && <span className="mr-2 font-mono text-2xs text-subtle">{i.sublabel}</span>}
            {i.label}
          </span>
        );
        return (
          <li key={i.id}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              {i.href ? (
                <Link href={i.href} className="min-w-0 truncate hover:text-primary">
                  {label}
                </Link>
              ) : (
                label
              )}
              <span className="flex shrink-0 items-center gap-2">
                {i.right}
                <span className="w-10 text-right font-mono text-xs text-fg">{i.value}%</span>
              </span>
            </div>
            <Progress value={i.value} tone={i.tone ?? (i.value === 100 ? "success" : "orange")} />
          </li>
        );
      })}
    </ul>
  );
}
