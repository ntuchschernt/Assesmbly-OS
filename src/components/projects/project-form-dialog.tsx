"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { saveProject } from "@/actions/projects";
import { PROJECT_STATUS, PRIORITY, options } from "@/lib/constants";
import type { SelectOption } from "@/components/ui/input";

export type ProjectFormValues = {
  name: string;
  key: string;
  customer: string;
  description: string;
  status: string;
  priority: string;
  ownerId: string;
  startDate: string;
  endDate: string;
};

const EMPTY: ProjectFormValues = { name: "", key: "", customer: "", description: "", status: "PLANNING", priority: "MEDIUM", ownerId: "", startDate: "", endDate: "" };

export function ProjectFormDialog({
  projectId,
  initial,
  users,
  trigger,
  defaultOpen = false,
  onClosed,
}: {
  projectId?: string;
  initial?: ProjectFormValues;
  users: SelectOption[];
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  /** When provided, the dialog is controlled by the parent and reports closing. */
  onClosed?: () => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const router = useRouter();
  const f = useActionForm<ProjectFormValues>(initial ?? EMPTY);

  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o && onClosed) onClosed();
        else if (!o && defaultOpen) router.replace("/projects");
      }}
    >
      {trigger && <span onClick={() => setOpen(true)}>{trigger}</span>}
      <DialogContent title={projectId ? "Projekt bearbeiten" : "Neues Projekt"} description="Stammdaten, Verantwortung und Zeitraum" size="lg">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            f.submit((v) => saveProject(projectId ?? null, v), {
              onSuccess: (data) => {
                setOpen(false);
                onClosed?.();
                if (!projectId && data) router.push(`/projects/${data.id}`);
                else router.refresh();
              },
            });
          }}
          noValidate
          className="grid gap-4 sm:grid-cols-6"
        >
          <Field label="Projektname" required error={f.errors.name} className="sm:col-span-4">
            <Input {...f.bind("name")} placeholder="z. B. Vakuumanlage VX-500" autoFocus />
          </Field>
          <Field label="Kürzel" required error={f.errors.key} hint="2–6 Zeichen" className="sm:col-span-2">
            <Input {...f.bind("key")} placeholder="VX5" className="font-mono uppercase" maxLength={6} />
          </Field>
          <Field label="Kunde" error={f.errors.customer} className="sm:col-span-3">
            <Input {...f.bind("customer")} placeholder="Kunde / Auftraggeber" />
          </Field>
          <Field label="Projektverantwortlich" error={f.errors.ownerId} className="sm:col-span-3">
            <Select {...f.bind("ownerId")} options={users} placeholder="— nicht zugewiesen —" />
          </Field>
          <Field label="Status" className="sm:col-span-3">
            <Select {...f.bind("status")} options={options(PROJECT_STATUS)} />
          </Field>
          <Field label="Priorität" className="sm:col-span-3">
            <Select {...f.bind("priority")} options={options(PRIORITY)} />
          </Field>
          <Field label="Startdatum" error={f.errors.startDate} className="sm:col-span-3">
            <Input type="date" {...f.bind("startDate")} />
          </Field>
          <Field label="Enddatum" error={f.errors.endDate} className="sm:col-span-3">
            <Input type="date" {...f.bind("endDate")} />
          </Field>
          <Field label="Beschreibung" error={f.errors.description} className="sm:col-span-6">
            <Textarea {...f.bind("description")} rows={4} placeholder="Lieferumfang, Ziele, Meilensteine …" />
          </Field>
          <DialogFooter className="sm:col-span-6">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" loading={f.pending}>
              {projectId ? "Speichern" : "Projekt anlegen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
