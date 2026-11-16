"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input, Select, type SelectOption } from "./input";
import { Button } from "./button";

export type FilterField =
  | { type: "search"; key: string; placeholder?: string }
  | { type: "select"; key: string; options: SelectOption[]; placeholder: string }
  | { type: "toggle"; key: string; label: string };

/** URL-driven filter row: every filter is a search param, so views are shareable and server-rendered. */
export function FilterBar({ fields, children }: { fields: FilterField[]; children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const searchField = fields.find((f) => f.type === "search");
  const [q, setQ] = useState(searchField ? (params.get(searchField.key) ?? "") : "");

  const update = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!searchField) return;
    const current = params.get(searchField.key) ?? "";
    if (q === current) return;
    const t = setTimeout(() => update(searchField.key, q.trim() || null), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = fields.some((f) => params.get(f.key));

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {fields.map((f) => {
        if (f.type === "search")
          return (
            <div key={f.key} className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={f.placeholder ?? "Suchen…"} className="h-8 pl-8 text-xs" aria-label={f.placeholder ?? "Suchen"} />
            </div>
          );
        if (f.type === "select")
          return (
            <Select
              key={f.key}
              aria-label={f.placeholder}
              value={params.get(f.key) ?? ""}
              onChange={(e) => update(f.key, e.target.value || null)}
              options={f.options}
              placeholder={f.placeholder}
              className="h-8 w-auto min-w-36 max-w-56 text-xs"
            />
          );
        const on = params.get(f.key) === "1";
        return (
          <button
            key={f.key}
            onClick={() => update(f.key, on ? null : "1")}
            className={`h-8 rounded-md border px-3 text-xs cursor-pointer ${on ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted hover:text-fg"}`}
          >
            {f.label}
          </button>
        );
      })}
      {active && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setQ("");
            const next = new URLSearchParams(params.toString());
            fields.forEach((f) => next.delete(f.key));
            router.replace(`${pathname}?${next.toString()}`, { scroll: false });
          }}
        >
          <X /> Filter zurücksetzen
        </Button>
      )}
      {children && <div className="ml-auto flex items-center gap-2">{children}</div>}
    </div>
  );
}
