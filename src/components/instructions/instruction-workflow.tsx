"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CheckCircle2, Rocket, Send, Trash2, Undo2 } from "lucide-react";
import type { InstructionStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Field, Textarea } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/confirm";
import { useAction } from "@/components/ui/use-action-form";
import { deleteInstruction, transitionInstruction } from "@/actions/instructions";
import { INSTRUCTION_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const FLOW: InstructionStatus[] = ["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED"];

/** Review & release workflow. Approval and publishing are explicit human decisions. */
export function InstructionWorkflow({ id, status, version, canApprove, isAuthor, deletable }: { id: string; status: InstructionStatus; version: number; canApprove: boolean; isAuthor: boolean; deletable: boolean }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const go = (to: InstructionStatus, n?: string) => run(() => transitionInstruction({ id, to, note: n }), { onSuccess: () => { setRejecting(false); setNote(""); router.refresh(); } });

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="label-caps mb-3">Freigabe-Workflow · Version {version}</div>
      <ol className="mb-4 flex items-center gap-1">
        {FLOW.map((s, i) => {
          const reached = FLOW.indexOf(status) >= i;
          return (
            <li key={s} className="flex flex-1 items-center gap-1">
              <span className={cn("flex-1 whitespace-nowrap rounded px-1 py-1 text-center text-2xs font-medium", s === status ? "bg-primary/15 text-primary" : reached ? "bg-elevated text-fg" : "text-subtle")}>{INSTRUCTION_STATUS[s].label}</span>
              {i < FLOW.length - 1 && <span className={cn("h-px w-2", reached ? "bg-primary/60" : "bg-border")} />}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-col gap-2">
        {status === "DRAFT" && (
          <Button onClick={() => go("IN_REVIEW")} loading={pending}><Send /> Zur Prüfung einreichen</Button>
        )}
        {status === "IN_REVIEW" && (
          <>
            <Button onClick={() => go("APPROVED")} loading={pending} disabled={!canApprove || isAuthor}><BadgeCheck /> Fachlich freigeben</Button>
            {isAuthor && canApprove && <p className="text-2xs text-subtle">Vier-Augen-Prinzip: Autor kann nicht selbst freigeben.</p>}
          </>
        )}
        {status === "APPROVED" && (
          <ConfirmButton
            title={`Version ${version} veröffentlichen?`}
            description="Nach der Veröffentlichung ist diese Version die gültige Produktionsanweisung für alle verknüpften Montageaufträge. Der Inhalt wird unveränderlich gespeichert."
            confirmLabel="Veröffentlichen"
            onConfirm={() => go("PUBLISHED")}
            disabled={!canApprove}
            pending={pending}
          >
            <Rocket /> Für Produktion veröffentlichen
          </ConfirmButton>
        )}
        {(status === "IN_REVIEW" || status === "APPROVED") && (
          <Button variant="secondary" onClick={() => setRejecting(true)} disabled={pending || (!canApprove && status === "APPROVED")}><Undo2 /> Zurückweisen</Button>
        )}
        {status === "PUBLISHED" && (
          <p className="flex items-start gap-2 text-xs text-success"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> Gültige Produktionsversion. Änderungen im Editor erzeugen eine neue Version.</p>
        )}
        {!canApprove && status !== "DRAFT" && status !== "PUBLISHED" && <p className="text-2xs text-subtle">Deine Rolle darf nicht freigeben.</p>}
        {deletable && (
          <ConfirmButton variant="ghost" size="sm" title="Entwurf löschen?" description="Der nie veröffentlichte Entwurf wird inklusive Schritten gelöscht." confirmLabel="Löschen" onConfirm={() => run(() => deleteInstruction(id), { onSuccess: () => router.push("/work-instructions") })}>
            <Trash2 /> Entwurf löschen
          </ConfirmButton>
        )}
      </div>
      <Dialog open={rejecting} onOpenChange={setRejecting}>
        <DialogContent title="Zurückweisen" description="Die Anweisung geht zurück in den Status Draft." size="sm">
          <Field label="Begründung" required>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Was muss überarbeitet werden?" />
          </Field>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(false)}>Abbrechen</Button>
            <Button variant="danger" disabled={!note.trim()} loading={pending} onClick={() => go("DRAFT", note)}>Zurückweisen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
