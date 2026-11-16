"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pause, Play, Send, Trash2, Undo2 } from "lucide-react";
import type { WorkOrderStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { useAction, useActionForm } from "@/components/ui/use-action-form";
import { deleteTimeEntry, logTime, setWorkOrderStatus } from "@/actions/assembly";
import { WORK_ORDER_TRANSITIONS } from "@/lib/services/work-order-rules";

const LABELS: Record<WorkOrderStatus, { label: string; icon: React.ReactNode; variant: "primary" | "secondary" }> = {
  PLANNED: { label: "Zurück auf geplant", icon: <Undo2 />, variant: "secondary" },
  RELEASED: { label: "Freigeben", icon: <Send />, variant: "primary" },
  IN_PROGRESS: { label: "Starten", icon: <Play />, variant: "primary" },
  PAUSED: { label: "Pausieren", icon: <Pause />, variant: "secondary" },
  COMPLETED: { label: "Abschließen", icon: <CheckCircle2 />, variant: "primary" },
};

export function WorkOrderStatusActions({ id, status }: { id: string; status: WorkOrderStatus }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [target, setTarget] = useState<WorkOrderStatus | null>(null);
  const next = WORK_ORDER_TRANSITIONS[status];
  if (!next.length) return null;
  return (
    <>
      {next.map((s) => (
        <Button
          key={s}
          size="sm"
          variant={LABELS[s].variant}
          loading={pending && target === s}
          disabled={pending}
          onClick={() => {
            setTarget(s);
            run(() => setWorkOrderStatus(id, s), { onSuccess: () => router.refresh() });
          }}
        >
          {LABELS[s].icon}
          {status === "PAUSED" && s === "IN_PROGRESS" ? "Fortsetzen" : LABELS[s].label}
        </Button>
      ))}
    </>
  );
}

export function TimeLogForm({ workOrderId, disabled }: { workOrderId: string; disabled?: boolean }) {
  const router = useRouter();
  const f = useActionForm({ hours: "1", note: "" });
  return (
    <form
      noValidate
      className="grid grid-cols-[90px_1fr_auto] items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const minutes = Math.round(Number(String(f.values.hours).replace(",", ".")) * 60);
        f.submit(() => logTime({ workOrderId, minutes, note: f.values.note }), { onSuccess: () => { f.reset(); router.refresh(); } });
      }}
    >
      <Field label="Stunden" error={f.errors.minutes}>
        <Input {...f.bind("hours")} inputMode="decimal" disabled={disabled} />
      </Field>
      <Field label="Notiz">
        <Input {...f.bind("note")} placeholder="Tätigkeit" disabled={disabled} />
      </Field>
      <Button type="submit" variant="secondary" loading={f.pending} disabled={disabled}>Erfassen</Button>
    </form>
  );
}

export function DeleteTimeEntryButton({ id }: { id: string }) {
  const router = useRouter();
  const { run } = useAction();
  return (
    <button onClick={() => run(() => deleteTimeEntry(id), { onSuccess: () => router.refresh() })} className="rounded p-1 text-subtle hover:bg-elevated hover:text-danger cursor-pointer" aria-label="Zeiteintrag löschen">
      <Trash2 className="size-3.5" />
    </button>
  );
}
