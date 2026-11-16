"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Paperclip, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Textarea, type SelectOption } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/confirm";
import { useAction } from "@/components/ui/use-action-form";
import { addComment, deleteAttachment, deleteTask, saveTask, uploadAttachment } from "@/actions/tasks";
import { TASK_STATUS, options } from "@/lib/constants";
import { formatBytes, relativeTime } from "@/lib/utils";
import { TaskFormDialog, type TaskFormValues } from "./task-form-dialog";
import type { LinkOptions } from "@/lib/services/tasks";

export function TaskHeaderActions({ id, number, values, users, links }: { id: string; number: number; values: TaskFormValues; users: SelectOption[]; links: LinkOptions }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [editing, setEditing] = useState(false);
  return (
    <>
      <Select
        aria-label="Status ändern"
        value={values.status}
        options={options(TASK_STATUS)}
        className="h-8 w-40 text-xs"
        onChange={(e) => run(() => saveTask(id, { ...values, status: e.target.value }), { success: "Status geändert", onSuccess: () => router.refresh() })}
        disabled={pending}
      />
      <ConfirmButton
        variant="secondary"
        size="sm"
        title={`TSK-${number} löschen?`}
        description="Die Aufgabe inklusive Kommentaren und Anhängen wird dauerhaft gelöscht. Verknüpfte Qualitätsmeldungen bleiben erhalten."
        confirmLabel="Endgültig löschen"
        onConfirm={() => run(() => deleteTask(id), { onSuccess: () => router.push("/tasks") })}
      >
        <Trash2 /> Löschen
      </ConfirmButton>
      <Button size="sm" onClick={() => setEditing(true)}>
        <Pencil /> Bearbeiten
      </Button>
      <TaskFormDialog key={JSON.stringify(values)} taskId={id} initial={values} users={users} links={links} open={editing} onOpenChange={setEditing} />
    </>
  );
}

export function CommentForm({ taskId }: { taskId: string }) {
  const [body, setBody] = useState("");
  const router = useRouter();
  const { pending, run } = useAction();
  return (
    <form
      className="mt-4 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) return toast.error("Kommentar darf nicht leer sein.");
        run(() => addComment({ taskId, body }), {
          onSuccess: () => {
            setBody("");
            router.refresh();
          },
        });
      }}
    >
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Kommentar schreiben…" aria-label="Kommentar" />
      <div className="flex justify-end">
        <Button type="submit" size="sm" loading={pending} disabled={!body.trim()}>
          Kommentieren
        </Button>
      </div>
    </form>
  );
}

type Att = { id: string; fileName: string; size: number; storageKey: string; createdAt: string; uploadedBy: string | null };

export function Attachments({ taskId, attachments }: { taskId: string; attachments: Att[] }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [uploading, start] = useTransition();
  const { run } = useAction();

  const upload = (file: File) =>
    start(async () => {
      const fd = new FormData();
      fd.set("taskId", taskId);
      fd.set("file", file);
      const res = await uploadAttachment(fd);
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else toast.error(res.error);
      if (input.current) input.current.value = "";
    });

  return (
    <div>
      <ul className="space-y-1.5">
        {attachments.length === 0 && <li className="text-xs text-muted">Keine Anhänge.</li>}
        {attachments.map((a) => (
          <li key={a.id} className="group flex items-center gap-2 rounded-md border border-border px-2.5 py-2 text-sm">
            <Paperclip className="size-3.5 shrink-0 text-muted" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{a.fileName}</span>
              <span className="block text-2xs text-subtle">
                {formatBytes(a.size)} · {a.uploadedBy ?? "—"} · {relativeTime(a.createdAt)}
              </span>
            </span>
            <a href={`/api/files/${a.storageKey.split("/").map(encodeURIComponent).join("/")}`} className="rounded p-1 text-muted hover:bg-elevated hover:text-fg" aria-label={`${a.fileName} herunterladen`}>
              <Download className="size-3.5" />
            </a>
            <button onClick={() => run(() => deleteAttachment(a.id), { onSuccess: () => router.refresh() })} className="rounded p-1 text-muted hover:bg-elevated hover:text-danger cursor-pointer" aria-label={`${a.fileName} entfernen`}>
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <input ref={input} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <Button variant="secondary" size="sm" className="mt-3 w-full" loading={uploading} onClick={() => input.current?.click()}>
        {!uploading && <Upload />} Datei anhängen
      </Button>
    </div>
  );
}
