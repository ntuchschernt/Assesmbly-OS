"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, type SelectOption } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { saveQualityIssue } from "@/actions/quality";
import { QUALITY_TYPE, SEVERITY, options } from "@/lib/constants";
import type { LinkOptions } from "@/lib/services/tasks";

export type QualityFormValues = {
  title: string;
  description: string;
  type: string;
  severity: string;
  rootCause: string;
  assigneeId: string;
  dueDate: string;
  projectId: string;
  machineId: string;
  assemblyId: string;
  workOrderId: string;
  taskId: string;
  documentId: string;
};

const EMPTY: QualityFormValues = { title: "", description: "", type: "DEFECT", severity: "MAJOR", rootCause: "", assigneeId: "", dueDate: "", projectId: "", machineId: "", assemblyId: "", workOrderId: "", taskId: "", documentId: "" };

export function QualityFormDialog({
  issueId,
  initial,
  users,
  links,
  trigger,
  defaultOpen,
  title,
  onDone,
}: {
  issueId?: string;
  initial?: Partial<QualityFormValues>;
  users: SelectOption[];
  links: LinkOptions;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  title?: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const router = useRouter();
  const f = useActionForm<QualityFormValues>({ ...EMPTY, ...initial });
  const v = f.values;
  const machines = links.machines.filter((m) => !v.projectId || m.projectId === v.projectId);
  const assemblies = links.assemblies.filter((a) => (!v.projectId || a.projectId === v.projectId) && (!v.machineId || a.machineId === v.machineId));
  const workOrders = links.workOrders.filter((w) => (v.assemblyId ? w.assemblyId === v.assemblyId : assemblies.some((a) => a.value === w.assemblyId)));

  const change = (o: boolean) => {
    setOpen(o);
    if (!o) onDone?.();
  };

  return (
    <Dialog open={open} onOpenChange={change}>
      {trigger && <span className="contents" onClick={() => setOpen(true)}>{trigger}</span>}
      <DialogContent title={title ?? (issueId ? "Qualitätsmeldung bearbeiten" : "Neue Qualitätsmeldung")} description="Fehler, Abweichungen oder Prüfbefunde dokumentieren" size="lg">
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault();
            f.submit((vals) => saveQualityIssue(issueId ?? null, vals), {
              onSuccess: (data) => {
                change(false);
                if (!issueId && data) router.push(`/quality/${data.id}`);
                else router.refresh();
              },
            });
          }}
        >
          <Field label="Titel" required error={f.errors.title} className="sm:col-span-6">
            <Input {...f.bind("title")} placeholder="Kurzbeschreibung des Befunds" autoFocus />
          </Field>
          <Field label="Art" className="sm:col-span-2">
            <Select {...f.bind("type")} options={options(QUALITY_TYPE)} />
          </Field>
          <Field label="Schweregrad" className="sm:col-span-2">
            <Select {...f.bind("severity")} options={options(SEVERITY)} />
          </Field>
          <Field label="Frist" error={f.errors.dueDate} className="sm:col-span-2">
            <Input type="date" {...f.bind("dueDate")} />
          </Field>
          <Field label="Beschreibung" required error={f.errors.description} className="sm:col-span-6" hint="Was wurde wo festgestellt? Messwerte, Position, Menge.">
            <Textarea {...f.bind("description")} rows={4} />
          </Field>
          <Field label="Ursache (Root Cause)" error={f.errors.rootCause} className="sm:col-span-4">
            <Input {...f.bind("rootCause")} placeholder="falls bekannt" />
          </Field>
          <Field label="Verantwortlich" className="sm:col-span-2">
            <Select {...f.bind("assigneeId")} options={users} placeholder="— offen —" />
          </Field>
          <div className="label-caps -mb-2 border-t border-border pt-3 sm:col-span-6">Verknüpfungen</div>
          <Field label="Projekt" className="sm:col-span-2">
            <Select {...f.bind("projectId")} onChange={(e) => f.setValues((s) => ({ ...s, projectId: e.target.value, machineId: "", assemblyId: "", workOrderId: "" }))} options={links.projects} placeholder="—" />
          </Field>
          <Field label="Maschine" className="sm:col-span-2">
            <Select {...f.bind("machineId")} onChange={(e) => f.setValues((s) => ({ ...s, machineId: e.target.value, assemblyId: "", workOrderId: "" }))} options={machines} placeholder="—" />
          </Field>
          <Field label="Baugruppe" className="sm:col-span-2">
            <Select {...f.bind("assemblyId")} onChange={(e) => f.setValues((s) => ({ ...s, assemblyId: e.target.value, workOrderId: "" }))} options={assemblies} placeholder="—" />
          </Field>
          <Field label="Montageauftrag" className="sm:col-span-2">
            <Select {...f.bind("workOrderId")} options={workOrders} placeholder="—" />
          </Field>
          <Field label="Aufgabe" className="sm:col-span-2">
            <Select {...f.bind("taskId")} options={links.tasks} placeholder="—" />
          </Field>
          <Field label="Dokument" className="sm:col-span-2">
            <Select {...f.bind("documentId")} options={links.documents} placeholder="—" />
          </Field>
          <DialogFooter className="sm:col-span-6">
            <Button variant="ghost" onClick={() => change(false)}>Abbrechen</Button>
            <Button type="submit" loading={f.pending}>{issueId ? "Speichern" : "Meldung erstellen"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
