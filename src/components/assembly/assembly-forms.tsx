"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, type SelectOption } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { saveAssembly, saveMachine, saveWorkOrder } from "@/actions/assembly";
import { ASSEMBLY_STATUS, MACHINE_STATUS, PRIORITY, options } from "@/lib/constants";

type Common = { trigger?: React.ReactNode; defaultOpen?: boolean; onDone?: () => void };

function useDialog(defaultOpen?: boolean, onDone?: () => void) {
  const [open, setOpen] = useState(!!defaultOpen);
  return {
    open,
    setOpen: (o: boolean) => {
      setOpen(o);
      if (!o) onDone?.();
    },
  };
}

// ---------------------------------------------------------------- Machine
export type MachineValues = { projectId: string; code: string; name: string; serialNumber: string; description: string; status: string };

export function MachineFormDialog({ id, initial, projects, trigger, defaultOpen, onDone }: Common & { id?: string; initial?: Partial<MachineValues>; projects: SelectOption[] }) {
  const d = useDialog(defaultOpen, onDone);
  const router = useRouter();
  const f = useActionForm<MachineValues>({ projectId: "", code: "", name: "", serialNumber: "", description: "", status: "PLANNED", ...initial });
  return (
    <Dialog open={d.open} onOpenChange={d.setOpen}>
      {trigger && <span className="contents" onClick={() => d.setOpen(true)}>{trigger}</span>}
      <DialogContent title={id ? "Maschine bearbeiten" : "Neue Maschine"}>
        <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); f.submit((v) => saveMachine(id ?? null, v), { onSuccess: () => { d.setOpen(false); router.refresh(); } }); }}>
          <Field label="Projekt" required error={f.errors.projectId} className="sm:col-span-2"><Select {...f.bind("projectId")} options={projects} placeholder="— Projekt wählen —" /></Field>
          <Field label="Kennung" required error={f.errors.code}><Input {...f.bind("code")} placeholder="z. B. PU-30" className="font-mono" /></Field>
          <Field label="Status"><Select {...f.bind("status")} options={options(MACHINE_STATUS)} /></Field>
          <Field label="Name" required error={f.errors.name} className="sm:col-span-2"><Input {...f.bind("name")} placeholder="Pump Unit PU-30" /></Field>
          <Field label="Seriennummer" error={f.errors.serialNumber} className="sm:col-span-2"><Input {...f.bind("serialNumber")} className="font-mono" /></Field>
          <Field label="Beschreibung" className="sm:col-span-2"><Textarea {...f.bind("description")} rows={3} /></Field>
          <DialogFooter className="sm:col-span-2"><Button variant="ghost" onClick={() => d.setOpen(false)}>Abbrechen</Button><Button type="submit" loading={f.pending}>Speichern</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Assembly
export type AssemblyValues = { machineId: string; parentId: string; code: string; name: string; description: string; status: string; responsibleId: string };
export type ParentOption = SelectOption & { machineId: string };

export function AssemblyFormDialog({
  id,
  initial,
  machines,
  parents,
  users,
  trigger,
  defaultOpen,
  onDone,
}: Common & { id?: string; initial?: Partial<AssemblyValues>; machines: SelectOption[]; parents: ParentOption[]; users: SelectOption[] }) {
  const d = useDialog(defaultOpen, onDone);
  const router = useRouter();
  const f = useActionForm<AssemblyValues>({ machineId: "", parentId: "", code: "", name: "", description: "", status: "PLANNED", responsibleId: "", ...initial });
  const parentOptions = parents.filter((p) => p.machineId === f.values.machineId && p.value !== id);
  return (
    <Dialog open={d.open} onOpenChange={d.setOpen}>
      {trigger && <span className="contents" onClick={() => d.setOpen(true)}>{trigger}</span>}
      <DialogContent title={id ? "Baugruppe bearbeiten" : initial?.parentId ? "Neue Unterbaugruppe" : "Neue Baugruppe"}>
        <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); f.submit((v) => saveAssembly(id ?? null, v), { onSuccess: (data) => { d.setOpen(false); if (!id && data) router.push(`/assembly/assemblies/${data.id}`); else router.refresh(); } }); }}>
          <Field label="Maschine" required error={f.errors.machineId}><Select {...f.bind("machineId")} onChange={(e) => f.setValues((s) => ({ ...s, machineId: e.target.value, parentId: "" }))} options={machines} placeholder="— Maschine wählen —" /></Field>
          <Field label="Übergeordnete Baugruppe" hint="Leer = Hauptbaugruppe"><Select {...f.bind("parentId")} options={parentOptions} placeholder="— keine (Hauptbaugruppe) —" /></Field>
          <Field label="Sachnummer" required error={f.errors.code}><Input {...f.bind("code")} placeholder="VX4-500" className="font-mono" /></Field>
          <Field label="Status"><Select {...f.bind("status")} options={options(ASSEMBLY_STATUS)} /></Field>
          <Field label="Name" required error={f.errors.name} className="sm:col-span-2"><Input {...f.bind("name")} /></Field>
          <Field label="Verantwortlich" className="sm:col-span-2"><Select {...f.bind("responsibleId")} options={users} placeholder="— nicht zugewiesen —" /></Field>
          <Field label="Beschreibung" className="sm:col-span-2"><Textarea {...f.bind("description")} rows={3} /></Field>
          <DialogFooter className="sm:col-span-2"><Button variant="ghost" onClick={() => d.setOpen(false)}>Abbrechen</Button><Button type="submit" loading={f.pending}>Speichern</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- Work order
export type WorkOrderValues = { assemblyId: string; workInstructionId: string; title: string; description: string; priority: string; assigneeId: string; plannedHours: string; dueDate: string };

export function WorkOrderFormDialog({
  id,
  initial,
  assemblies,
  instructions,
  users,
  trigger,
  defaultOpen,
  onDone,
}: Common & { id?: string; initial?: Partial<WorkOrderValues>; assemblies: SelectOption[]; instructions: SelectOption[]; users: SelectOption[] }) {
  const d = useDialog(defaultOpen, onDone);
  const router = useRouter();
  const f = useActionForm<WorkOrderValues>({ assemblyId: "", workInstructionId: "", title: "", description: "", priority: "MEDIUM", assigneeId: "", plannedHours: "8", dueDate: "", ...initial });
  return (
    <Dialog open={d.open} onOpenChange={d.setOpen}>
      {trigger && <span className="contents" onClick={() => d.setOpen(true)}>{trigger}</span>}
      <DialogContent title={id ? "Montageauftrag bearbeiten" : "Neuer Montageauftrag"} size="lg">
        <form noValidate className="grid gap-4 sm:grid-cols-6" onSubmit={(e) => { e.preventDefault(); f.submit((v) => saveWorkOrder(id ?? null, v), { onSuccess: (data) => { d.setOpen(false); if (!id && data) router.push(`/assembly/work-orders/${data.id}`); else router.refresh(); } }); }}>
          <Field label="Titel" required error={f.errors.title} className="sm:col-span-6"><Input {...f.bind("title")} placeholder="z. B. Ventileinheit endmontieren" /></Field>
          <Field label="Baugruppe" required error={f.errors.assemblyId} className="sm:col-span-3"><Select {...f.bind("assemblyId")} options={assemblies} placeholder="— Baugruppe wählen —" /></Field>
          <Field label="Montageanweisung" hint="Ausführung nur mit veröffentlichter Version" className="sm:col-span-3"><Select {...f.bind("workInstructionId")} options={instructions} placeholder="— keine —" /></Field>
          <Field label="Priorität" className="sm:col-span-2"><Select {...f.bind("priority")} options={options(PRIORITY)} /></Field>
          <Field label="Planzeit (h)" error={f.errors.plannedHours} className="sm:col-span-2"><Input type="number" min={0} step={0.5} {...f.bind("plannedHours")} /></Field>
          <Field label="Fällig" error={f.errors.dueDate} className="sm:col-span-2"><Input type="date" {...f.bind("dueDate")} /></Field>
          <Field label="Verantwortlich" className="sm:col-span-6"><Select {...f.bind("assigneeId")} options={users} placeholder="— nicht zugewiesen —" /></Field>
          <Field label="Beschreibung" className="sm:col-span-6"><Textarea {...f.bind("description")} rows={3} /></Field>
          <DialogFooter className="sm:col-span-6"><Button variant="ghost" onClick={() => d.setOpen(false)}>Abbrechen</Button><Button type="submit" loading={f.pending}>{id ? "Speichern" : "Auftrag anlegen"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
