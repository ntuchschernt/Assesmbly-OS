"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, type SelectOption } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { saveTask } from "@/actions/tasks";
import { PRIORITY, TASK_STATUS, options } from "@/lib/constants";
import type { LinkOptions } from "@/lib/services/tasks";

export type TaskFormValues = {
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeId: string;
  dueDate: string;
  labels: string;
  projectId: string;
  assemblyId: string;
  workOrderId: string;
};

export const EMPTY_TASK: TaskFormValues = { title: "", description: "", status: "OPEN", priority: "MEDIUM", assigneeId: "", dueDate: "", labels: "", projectId: "", assemblyId: "", workOrderId: "" };

export function TaskFormDialog({
  taskId,
  initial,
  users,
  links,
  trigger,
  open: controlledOpen,
  onOpenChange,
  redirectOnCreate = true,
}: {
  taskId?: string;
  initial?: Partial<TaskFormValues>;
  users: SelectOption[];
  links: LinkOptions;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  redirectOnCreate?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const router = useRouter();
  const f = useActionForm<TaskFormValues>({ ...EMPTY_TASK, ...initial });
  const v = f.values;

  const assemblies = links.assemblies.filter((a) => !v.projectId || a.projectId === v.projectId);
  const workOrders = links.workOrders.filter((w) => (v.assemblyId ? w.assemblyId === v.assemblyId : assemblies.some((a) => a.value === w.assemblyId)));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <span className="contents" onClick={() => setOpen(true)}>{trigger}</span>}
      <DialogContent title={taskId ? "Aufgabe bearbeiten" : "Neue Aufgabe"} size="lg">
        <form
          noValidate
          className="grid gap-4 sm:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault();
            f.submit((vals) => saveTask(taskId ?? null, vals), {
              onSuccess: (data) => {
                setOpen(false);
                if (!taskId) f.reset();
                if (!taskId && data && redirectOnCreate) router.push(`/tasks/${data.id}`);
                else router.refresh();
              },
            });
          }}
        >
          <Field label="Titel" required error={f.errors.title} className="sm:col-span-6">
            <Input {...f.bind("title")} placeholder="Was ist zu tun?" autoFocus />
          </Field>
          <Field label="Beschreibung" error={f.errors.description} className="sm:col-span-6">
            <Textarea {...f.bind("description")} rows={3} />
          </Field>
          <Field label="Status" className="sm:col-span-2">
            <Select {...f.bind("status")} options={options(TASK_STATUS)} />
          </Field>
          <Field label="Priorität" className="sm:col-span-2">
            <Select {...f.bind("priority")} options={options(PRIORITY)} />
          </Field>
          <Field label="Fällig am" error={f.errors.dueDate} className="sm:col-span-2">
            <Input type="date" {...f.bind("dueDate")} />
          </Field>
          <Field label="Verantwortlich" className="sm:col-span-3">
            <Select {...f.bind("assigneeId")} options={users} placeholder="— nicht zugewiesen —" />
          </Field>
          <Field label="Labels" hint="Kommagetrennt, z. B. Montage, Einkauf" error={f.errors.labels} className="sm:col-span-3">
            <Input {...f.bind("labels")} placeholder="Montage, Qualität" />
          </Field>
          <div className="label-caps sm:col-span-6 -mb-2 border-t border-border pt-3">Verknüpfungen</div>
          <Field label="Projekt" className="sm:col-span-2">
            <Select
              {...f.bind("projectId")}
              onChange={(e) => f.setValues((s) => ({ ...s, projectId: e.target.value, assemblyId: "", workOrderId: "" }))}
              options={links.projects}
              placeholder="— keins —"
            />
          </Field>
          <Field label="Baugruppe" className="sm:col-span-2">
            <Select {...f.bind("assemblyId")} onChange={(e) => f.setValues((s) => ({ ...s, assemblyId: e.target.value, workOrderId: "" }))} options={assemblies} placeholder="— keine —" />
          </Field>
          <Field label="Montageauftrag" className="sm:col-span-2">
            <Select {...f.bind("workOrderId")} options={workOrders} placeholder="— keiner —" />
          </Field>
          <DialogFooter className="sm:col-span-6">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" loading={f.pending}>
              {taskId ? "Speichern" : "Aufgabe erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
