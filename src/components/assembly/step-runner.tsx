"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldAlert, Undo2, Wrench, Package, Target, XCircle, AlertTriangle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea, type SelectOption } from "@/components/ui/input";
import { useAction } from "@/components/ui/use-action-form";
import { recordStep } from "@/actions/assembly";
import { QualityFormDialog } from "@/components/quality/quality-form-dialog";
import { cn, formatDateTime } from "@/lib/utils";
import type { SnapshotStep } from "@/lib/services/instruction-snapshot";
import type { LinkOptions } from "@/lib/services/tasks";

type Exec = { status: "PENDING" | "DONE" | "FAILED"; resultNote: string | null; completedBy: string | null; completedAt: string | null };

export function StepRunner({
  workOrderId,
  steps,
  executions,
  editable,
  qualityContext,
}: {
  workOrderId: string;
  steps: SnapshotStep[];
  executions: Record<string, Exec>;
  editable: boolean;
  qualityContext: { users: SelectOption[]; links: LinkOptions; initial: Record<string, string> };
}) {
  const firstOpen = steps.find((s) => (executions[s.id]?.status ?? "PENDING") !== "DONE")?.id ?? null;
  return (
    <ol className="space-y-4">
      {steps.map((s) => (
        <StepCard key={s.id} step={s} exec={executions[s.id]} current={s.id === firstOpen} workOrderId={workOrderId} editable={editable} qualityContext={qualityContext} />
      ))}
    </ol>
  );
}

function StepCard({ step, exec, current, workOrderId, editable, qualityContext }: { step: SnapshotStep; exec?: Exec; current: boolean; workOrderId: string; editable: boolean; qualityContext: { users: SelectOption[]; links: LinkOptions; initial: Record<string, string> } }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [note, setNote] = useState(exec?.resultNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const status = exec?.status ?? "PENDING";

  const submit = (s: Exec["status"]) => {
    setError(null);
    if (s !== "PENDING" && step.isCheckpoint && !note.trim()) return setError("Prüfpunkt: Messwert / Ergebnis eintragen.");
    if (s === "FAILED" && !note.trim()) return setError("Bitte die Abweichung beschreiben.");
    run(() => recordStep({ workOrderId, stepId: step.id, status: s, resultNote: note }), {
      onSuccess: () => {
        router.refresh();
        if (s === "FAILED") setReportOpen(true);
      },
    });
  };

  return (
    <li
      id={`step-${step.order}`}
      className={cn(
        "rounded-lg border bg-surface",
        status === "DONE" ? "border-success/40" : status === "FAILED" ? "border-danger/50" : current ? "border-primary/60 shadow-[0_0_0_1px_rgba(255,122,26,0.25)]" : "border-border",
      )}
    >
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-md border font-mono text-lg font-semibold", status === "DONE" ? "border-success/40 bg-success/10 text-success" : status === "FAILED" ? "border-danger/40 bg-danger/10 text-danger" : current ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted")}>
          {status === "DONE" ? <CheckCircle2 className="size-5" /> : status === "FAILED" ? <XCircle className="size-5" /> : step.order}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold sm:text-lg">{step.title}</h3>
            {step.isCheckpoint && <Badge tone="info">Prüfpunkt</Badge>}
            {step.safetyCritical && <Badge tone="danger"><AlertTriangle className="size-3" /> Sicherheitskritisch</Badge>}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-fg/90 sm:text-base">{step.description}</p>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            {step.tools.length > 0 && <Info icon={<Wrench />} label="Werkzeuge" items={step.tools} />}
            {step.parts.length > 0 && <Info icon={<Package />} label="Bauteile" items={step.parts} />}
          </div>
          {step.expectedResult && (
            <div className="mt-3 flex gap-2 rounded-md border border-info/30 bg-info/5 px-3 py-2 text-sm">
              <Target className="mt-0.5 size-4 shrink-0 text-info" />
              <span><span className="font-medium text-info">Erwartetes Prüfergebnis: </span>{step.expectedResult}</span>
            </div>
          )}
          {step.responsibleName && <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted"><User className="size-3" /> Verantwortlich: {step.responsibleName}</p>}

          {status !== "PENDING" && exec && (
            <p className={cn("mt-3 text-xs", status === "DONE" ? "text-success" : "text-danger")}>
              {status === "DONE" ? "✔ i.O." : "✖ nicht i.O."} · {exec.completedBy} · {formatDateTime(exec.completedAt)}
              {exec.resultNote && <span className="text-muted"> · „{exec.resultNote}“</span>}
            </p>
          )}

          {editable && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              {status === "PENDING" && (
                <Textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={step.isCheckpoint ? "Messwert / Prüfergebnis (Pflicht)" : "Bemerkung (optional, Pflicht bei nicht i.O.)"}
                  aria-label={`Ergebnis Schritt ${step.order}`}
                  aria-invalid={!!error}
                />
              )}
              {error && <p className="text-xs text-danger" role="alert">{error}</p>}
              <div className="flex flex-wrap gap-2">
                {status === "PENDING" ? (
                  <>
                    <Button size="lg" className="flex-1 sm:flex-none" onClick={() => submit("DONE")} loading={pending}>
                      <CheckCircle2 /> Schritt i.O.
                    </Button>
                    <Button size="lg" variant="danger" className="flex-1 sm:flex-none" onClick={() => submit("FAILED")} disabled={pending}>
                      <XCircle /> nicht i.O.
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => { setNote(""); submit("PENDING"); }} loading={pending}>
                    <Undo2 /> Zurücksetzen
                  </Button>
                )}
                {status === "FAILED" && (
                  <Button variant="secondary" size="sm" onClick={() => setReportOpen(true)}>
                    <ShieldAlert /> Qualitätsmeldung erstellen
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {reportOpen && (
        <QualityFormDialog
          defaultOpen
          onDone={() => setReportOpen(false)}
          title={`Abweichung in Schritt ${step.order} melden`}
          users={qualityContext.users}
          links={qualityContext.links}
          initial={{ ...qualityContext.initial, type: "DEVIATION", title: `Schritt ${step.order} nicht i.O.: ${step.title}`, description: `Erwartet: ${step.expectedResult ?? "—"}\nFestgestellt: ${note || exec?.resultNote || ""}` }}
        />
      )}
    </li>
  );
}

function Info({ icon, label, items }: { icon: React.ReactNode; label: string; items: string[] }) {
  return (
    <div className="rounded-md bg-elevated/50 px-3 py-2">
      <div className="mb-1 flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-muted [&_svg]:size-3">{icon} {label}</div>
      <ul className="space-y-0.5 text-sm">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
    </div>
  );
}
