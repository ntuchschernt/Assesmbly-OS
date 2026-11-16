"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { QualityStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, type SelectOption } from "@/components/ui/input";
import { useAction, useActionForm } from "@/components/ui/use-action-form";
import { addQualityAction, completeQualityAction, deleteQualityAction, setQualityStatus } from "@/actions/quality";
import { QUALITY_ACTION_TYPE, QUALITY_STATUS, QUALITY_STATUS_ORDER, options } from "@/lib/constants";
import { cn, formatDate, isOverdue } from "@/lib/utils";

export function QualityStatusStepper({ id, status }: { id: string; status: QualityStatus }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const idx = QUALITY_STATUS_ORDER.indexOf(status);
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="label-caps mb-3">Bearbeitungsstatus</div>
      <ol className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {QUALITY_STATUS_ORDER.map((s, i) => (
          <li key={s}>
            <button
              disabled={pending || s === status}
              onClick={() => run(() => setQualityStatus(id, s), { onSuccess: () => router.refresh() })}
              className={cn(
                "w-full rounded-md border px-2 py-2 text-2xs font-medium transition-colors cursor-pointer disabled:cursor-default",
                s === status ? "border-primary/60 bg-primary/15 text-primary" : i < idx ? "border-border bg-elevated text-fg hover:border-border-strong" : "border-border text-muted hover:border-border-strong hover:text-fg",
              )}
            >
              {QUALITY_STATUS[s].label}
            </button>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-2xs text-subtle">Resolved/Closed erfordern eine dokumentierte Ursache; Closed zusätzlich erledigte Maßnahmen.</p>
    </div>
  );
}

type ActionRow = { id: string; title: string; type: keyof typeof QUALITY_ACTION_TYPE; assignee: string | null; dueDate: string | null; done: boolean; result: string | null };

export function QualityActions({ issueId, actions, users }: { issueId: string; actions: ActionRow[]; users: SelectOption[] }) {
  const router = useRouter();
  const { run } = useAction();
  const [adding, setAdding] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const f = useActionForm({ title: "", type: "CORRECTIVE", assigneeId: "", dueDate: "" });

  return (
    <div>
      <ul className="divide-y divide-border">
        {actions.length === 0 && <li className="px-4 py-4 text-sm text-muted">Noch keine Maßnahmen definiert.</li>}
        {actions.map((a) => (
          <li key={a.id} className="flex gap-3 px-4 py-3">
            <button
              onClick={() => run(() => completeQualityAction(a.id, !a.done, results[a.id]), { onSuccess: () => router.refresh() })}
              className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border cursor-pointer", a.done ? "border-success bg-success/20 text-success" : "border-border-strong hover:border-primary")}
              aria-label={a.done ? "Wieder öffnen" : "Als erledigt markieren"}
            >
              {a.done && <Check className="size-3.5" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("text-sm", a.done && "text-muted line-through")}>{a.title}</span>
                <Badge tone={a.type === "VERIFICATION" ? "info" : a.type === "CONTAINMENT" ? "warning" : "neutral"}>{QUALITY_ACTION_TYPE[a.type].label}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-subtle">
                {a.assignee ?? "nicht zugewiesen"} · Frist <span className={isOverdue(a.dueDate, a.done) ? "text-danger" : ""}>{formatDate(a.dueDate)}</span>
              </p>
              {a.result && <p className="mt-1 text-xs text-fg/80">Ergebnis: {a.result}</p>}
              {!a.done && (
                <Input value={results[a.id] ?? ""} onChange={(e) => setResults((r) => ({ ...r, [a.id]: e.target.value }))} placeholder={a.type === "VERIFICATION" ? "Prüfergebnis (Pflicht zum Abschluss)" : "Ergebnis / Nachweis (optional)"} className="mt-2 h-8 text-xs" />
              )}
            </div>
            <div className="flex shrink-0 items-start gap-1">
              {a.done && (
                <button onClick={() => run(() => completeQualityAction(a.id, false), { onSuccess: () => router.refresh() })} className="rounded p-1 text-subtle hover:text-fg cursor-pointer" aria-label="Wieder öffnen"><RotateCcw className="size-3.5" /></button>
              )}
              <button onClick={() => run(() => deleteQualityAction(a.id), { onSuccess: () => router.refresh() })} className="rounded p-1 text-subtle hover:text-danger cursor-pointer" aria-label="Maßnahme löschen"><Trash2 className="size-3.5" /></button>
            </div>
          </li>
        ))}
      </ul>
      <div className="border-t border-border p-4">
        {adding ? (
          <form
            noValidate
            className="grid gap-3 sm:grid-cols-6"
            onSubmit={(e) => {
              e.preventDefault();
              f.submit((v) => addQualityAction({ ...v, issueId }), { onSuccess: () => { f.reset(); setAdding(false); router.refresh(); } });
            }}
          >
            <Field label="Maßnahme" required error={f.errors.title} className="sm:col-span-6"><Input {...f.bind("title")} autoFocus /></Field>
            <Field label="Art" className="sm:col-span-2"><Select {...f.bind("type")} options={options(QUALITY_ACTION_TYPE)} /></Field>
            <Field label="Verantwortlich" className="sm:col-span-2"><Select {...f.bind("assigneeId")} options={users} placeholder="—" /></Field>
            <Field label="Frist" className="sm:col-span-2"><Input type="date" {...f.bind("dueDate")} /></Field>
            <div className="flex justify-end gap-2 sm:col-span-6">
              <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>Abbrechen</Button>
              <Button type="submit" size="sm" loading={f.pending}>Hinzufügen</Button>
            </div>
          </form>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus /> Maßnahme / Prüfung hinzufügen</Button>
        )}
      </div>
    </div>
  );
}
