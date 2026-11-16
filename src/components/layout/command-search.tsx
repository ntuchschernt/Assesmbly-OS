"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Hit = { id: string; category: string; code: string; title: string; subtitle?: string; href: string };

const CATEGORY_LABEL: Record<string, string> = {
  project: "Projekte",
  task: "Aufgaben",
  machine: "Maschinen",
  assembly: "Baugruppen",
  document: "Dokumente",
  instruction: "Montageanweisungen",
  quality: "Qualitätsmeldungen",
};

export function CommandSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([]);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { hits: Hit[] };
        setHits(data.hits);
        setError(null);
        setActive(0);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Suche fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (href: string) => {
    setOpen(false);
    setQ("");
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (hits[active]) go(hits[active].href);
      else if (q.trim().length >= 2) go(`/search?q=${encodeURIComponent(q.trim())}`);
    }
  };

  const grouped = hits.reduce<Record<string, Hit[]>>((acc, h) => {
    (acc[h.category] ??= []).push(h);
    return acc;
  }, {});
  let index = -1;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button className="flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-xs text-muted hover:border-border-strong hover:text-fg sm:w-56 cursor-pointer" aria-label="Globale Suche">
          <Search className="size-3.5" />
          <span className="hidden flex-1 text-left sm:inline">Suchen…</span>
          <kbd className="hidden rounded border border-border bg-elevated px-1 font-mono text-[10px] sm:inline">⌘K</kbd>
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-border bg-surface shadow-2xl shadow-black/50">
          <DialogPrimitive.Title className="sr-only">Globale Suche</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">Projekte, Aufgaben, Maschinen, Baugruppen, Dokumente, Anweisungen und Qualitätsmeldungen durchsuchen</DialogPrimitive.Description>
          <div className="flex items-center gap-2 border-b border-border px-3">
            {loading ? <Loader2 className="size-4 animate-spin text-muted" /> : <Search className="size-4 text-muted" />}
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Projekte, Aufgaben, Baugruppen, Dokumente, QM …"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
            />
            <kbd className="rounded border border-border px-1.5 font-mono text-[10px] text-subtle">ESC</kbd>
          </div>
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-1.5">
            {q.trim().length < 2 && <p className="px-3 py-6 text-center text-xs text-muted">Mindestens 2 Zeichen eingeben. Beispiele: „Pumpe“, „QM-0001“, „DN100“, „VX-400“</p>}
            {error && <p className="px-3 py-6 text-center text-xs text-danger">{error}</p>}
            {!error && q.trim().length >= 2 && !loading && hits.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted">Keine Treffer für „{q}“</p>
            )}
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="mb-1">
                <div className="label-caps px-2.5 py-1.5">{CATEGORY_LABEL[cat]}</div>
                {items.map((h) => {
                  index++;
                  const i = index;
                  return (
                    <button
                      key={h.id}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(h.href)}
                      className={cn("flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left cursor-pointer", active === i ? "bg-elevated" : "")}
                    >
                      <span className="w-20 shrink-0 truncate font-mono text-2xs text-subtle">{h.code}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{h.title}</span>
                        {h.subtitle && <span className="block truncate text-xs text-subtle">{h.subtitle}</span>}
                      </span>
                      {active === i && <ArrowRight className="size-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {q.trim().length >= 2 && (
            <button onClick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)} className="flex w-full items-center justify-between border-t border-border px-4 py-2.5 text-xs text-muted hover:bg-elevated hover:text-fg cursor-pointer">
              Alle Ergebnisse für „{q.trim()}“ anzeigen <ArrowRight className="size-3.5" />
            </button>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
