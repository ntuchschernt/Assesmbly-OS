"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Copy, Info, Plus, Save, ShieldAlert, Target, Trash2 } from "lucide-react";
import type { InstructionStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea, type SelectOption } from "@/components/ui/input";
import { saveInstruction } from "@/actions/instructions";
import { cn } from "@/lib/utils";
import { emptyStep, newStepKey as newKey, type InstructionDraft, type StepDraft } from "./draft";

export type { StepDraft, InstructionDraft };

const lines = (s: string) => s.split(/\n|,/).map((x) => x.trim()).filter(Boolean);

export function InstructionEditor({
  id,
  status,
  version,
  initial,
  assemblies,
  users,
  images,
}: {
  id?: string;
  status?: InstructionStatus;
  version?: number;
  initial: InstructionDraft;
  assemblies: SelectOption[];
  users: SelectOption[];
  images: SelectOption[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const set = <K extends keyof InstructionDraft>(k: K, v: InstructionDraft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setDirty(true);
  };
  const setStep = (i: number, patch: Partial<StepDraft>) => {
    setDraft((d) => ({ ...d, steps: d.steps.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
    setDirty(true);
  };
  const moveStep = (i: number, dir: -1 | 1) => {
    setDraft((d) => {
      const steps = [...d.steps];
      const j = i + dir;
      if (j < 0 || j >= steps.length) return d;
      [steps[i], steps[j]] = [steps[j]!, steps[i]!];
      return { ...d, steps };
    });
    setDirty(true);
  };

  const save = () =>
    start(async () => {
      const payload = {
        title: draft.title,
        description: draft.description,
        assemblyId: draft.assemblyId,
        tools: lines(draft.tools),
        materials: lines(draft.materials),
        safetyNotes: draft.safetyNotes,
        imageUrls: lines(draft.imageUrls),
        steps: draft.steps.map((s) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          tools: lines(s.tools),
          parts: lines(s.parts),
          expectedResult: s.expectedResult,
          isCheckpoint: s.isCheckpoint,
          safetyCritical: s.safetyCritical,
          imageUrl: s.imageUrl,
          responsibleId: s.responsibleId,
        })),
      };
      const res = await saveInstruction(id ?? null, payload);
      if (res.ok) {
        setErrors({});
        setDirty(false);
        toast.success(res.message);
        if (!id && res.data) router.push(`/work-instructions/${res.data.id}`);
        else router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });

  return (
    <div className="space-y-6">
      {status === "PUBLISHED" && (
        <Notice tone="info">Diese Anweisung ist veröffentlicht. Beim Speichern entsteht <strong>Version {(version ?? 1) + 1}</strong> als Entwurf. Version {version} bleibt bis zur nächsten Veröffentlichung die gültige Produktionsanweisung.</Notice>
      )}
      {(status === "IN_REVIEW" || status === "APPROVED") && (
        <Notice tone="warning">Diese Version ist {status === "IN_REVIEW" ? "in Prüfung" : "freigegeben"}. Änderungen setzen sie auf <strong>Draft</strong> zurück – eine erneute Prüfung ist erforderlich.</Notice>
      )}

      <Card>
        <CardHeader title="Allgemein" description="Titel, Zuordnung, Werkzeuge, Material und Sicherheit" />
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field label="Titel" required error={errors.title} className="md:col-span-2">
            <Input value={draft.title} onChange={(e) => set("title", e.target.value)} aria-invalid={!!errors.title} placeholder="z. B. Ventileinheit DN100 montieren" />
          </Field>
          <Field label="Beschreibung" error={errors.description} className="md:col-span-2">
            <Textarea value={draft.description} onChange={(e) => set("description", e.target.value)} rows={3} />
          </Field>
          <Field label="Baugruppe">
            <Select value={draft.assemblyId} onChange={(e) => set("assemblyId", e.target.value)} options={assemblies} placeholder="— keine Zuordnung —" />
          </Field>
          <Field label="Referenzbilder / Dokument-Links" hint="Eine URL pro Zeile">
            <Textarea value={draft.imageUrls} onChange={(e) => set("imageUrls", e.target.value)} rows={1} placeholder="/documents/…" />
          </Field>
          <Field label="Werkzeuge" hint="Eines pro Zeile">
            <Textarea value={draft.tools} onChange={(e) => set("tools", e.target.value)} rows={4} placeholder={"Drehmomentschlüssel 40–200 Nm\nHallenkran 5 t"} />
          </Field>
          <Field label="Material" hint="Eines pro Zeile">
            <Textarea value={draft.materials} onChange={(e) => set("materials", e.target.value)} rows={4} placeholder={"Sechskantschraube M16×60 8.8 (12×)"} />
          </Field>
          <Field label="Sicherheitsinformationen" className="md:col-span-2" hint="Werden in der Montageausführung hervorgehoben angezeigt.">
            <Textarea value={draft.safetyNotes} onChange={(e) => set("safetyNotes", e.target.value)} rows={3} className="border-warning/40" placeholder="PSA, Gefährdungen, LOTO …" />
          </Field>
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="label-caps">Arbeitsschritte ({draft.steps.length})</h2>
          <Button size="sm" variant="secondary" onClick={() => { setDraft((d) => ({ ...d, steps: [...d.steps, emptyStep()] })); setDirty(true); }}>
            <Plus /> Schritt hinzufügen
          </Button>
        </div>
        {draft.steps.length === 0 && (
          <div className="bg-grid rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted">Noch keine Schritte. Für die Prüfung ist mindestens ein Schritt erforderlich.</div>
        )}
        <ol className="space-y-3">
          {draft.steps.map((s, i) => {
            const err = (f: string) => errors[`steps.${i}.${f}`];
            return (
              <li key={s.key} className={cn("rounded-lg border bg-surface", s.safetyCritical ? "border-danger/40" : "border-border")}>
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <span className="flex size-7 items-center justify-center rounded border border-border bg-elevated font-mono text-xs">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.title || <span className="text-subtle">Unbenannter Schritt</span>}</span>
                  <Button variant="ghost" size="icon-sm" onClick={() => moveStep(i, -1)} disabled={i === 0} aria-label="Nach oben"><ArrowUp /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => moveStep(i, 1)} disabled={i === draft.steps.length - 1} aria-label="Nach unten"><ArrowDown /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => { setDraft((d) => ({ ...d, steps: [...d.steps.slice(0, i + 1), { ...s, id: undefined, key: newKey(), title: `${s.title} (Kopie)` }, ...d.steps.slice(i + 1)] })); setDirty(true); }} aria-label="Duplizieren"><Copy /></Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => { setDraft((d) => ({ ...d, steps: d.steps.filter((_, idx) => idx !== i) })); setDirty(true); }} aria-label="Schritt entfernen" className="hover:!text-danger"><Trash2 /></Button>
                </div>
                <div className="grid gap-3 p-3 md:grid-cols-6">
                  <Field label="Schrittname" required error={err("title")} className="md:col-span-4">
                    <Input value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} aria-invalid={!!err("title")} />
                  </Field>
                  <Field label="Verantwortlich" className="md:col-span-2">
                    <Select value={s.responsibleId} onChange={(e) => setStep(i, { responsibleId: e.target.value })} options={users} placeholder="—" />
                  </Field>
                  <Field label="Beschreibung" required error={err("description")} className="md:col-span-6">
                    <Textarea value={s.description} onChange={(e) => setStep(i, { description: e.target.value })} rows={2} aria-invalid={!!err("description")} />
                  </Field>
                  <Field label="Werkzeuge" hint="Kommagetrennt" className="md:col-span-3">
                    <Input value={s.tools} onChange={(e) => setStep(i, { tools: e.target.value })} />
                  </Field>
                  <Field label="Bauteile" hint="Kommagetrennt" className="md:col-span-3">
                    <Input value={s.parts} onChange={(e) => setStep(i, { parts: e.target.value })} />
                  </Field>
                  <Field label="Erwartetes Prüfergebnis" className="md:col-span-4">
                    <Input value={s.expectedResult} onChange={(e) => setStep(i, { expectedResult: e.target.value })} placeholder="z. B. Anzugsmoment 85 Nm, markiert" />
                  </Field>
                  <Field label="Bild" className="md:col-span-2">
                    <Select value={s.imageUrl} onChange={(e) => setStep(i, { imageUrl: e.target.value })} options={images} placeholder={images.length ? "— kein Bild —" : "Keine Bilddateien"} />
                  </Field>
                  <div className="flex flex-wrap gap-5 md:col-span-6">
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={s.isCheckpoint} onChange={(e) => setStep(i, { isCheckpoint: e.target.checked })} /><Target className="size-3.5 text-info" /> Prüfpunkt (Ergebnis muss dokumentiert werden)</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={s.safetyCritical} onChange={(e) => setStep(i, { safetyCritical: e.target.checked })} /><ShieldAlert className="size-3.5 text-danger" /> Sicherheitskritisch</label>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="sticky bottom-3 z-10 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface/95 px-4 py-3 shadow-xl shadow-black/40 backdrop-blur">
        <span className="text-xs text-muted">{dirty ? "Ungespeicherte Änderungen" : "Alle Änderungen gespeichert"}</span>
        <Button onClick={save} loading={pending} disabled={!dirty && !!id}>
          <Save /> {id ? "Speichern" : "Entwurf anlegen"}
        </Button>
      </div>
    </div>
  );
}

function Notice({ tone, children }: { tone: "info" | "warning"; children: React.ReactNode }) {
  return (
    <div className={cn("flex gap-3 rounded-md border px-4 py-3 text-sm", tone === "info" ? "border-info/40 bg-info/10" : "border-warning/40 bg-warning/10")}>
      <Info className={cn("mt-0.5 size-4 shrink-0", tone === "info" ? "text-info" : "text-warning")} />
      <p className="text-fg/90">{children}</p>
    </div>
  );
}
