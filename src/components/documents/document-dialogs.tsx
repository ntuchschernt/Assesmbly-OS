"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileUp, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea, type SelectOption } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { updateDocument, uploadDocument, uploadDocumentVersion } from "@/actions/documents";
import { DOCUMENT_TYPE, options } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";
import { MAX_UPLOAD_BYTES } from "@/lib/validation/schemas";

type AssemblyOpt = SelectOption & { projectId: string };

function guessType(file: File): string {
  if (file.type.startsWith("image/")) return "IMAGE";
  if (/\.(dwg|dxf|step|stp)$/i.test(file.name)) return "DRAWING";
  if (/\.(xlsx|xls|csv)$/i.test(file.name)) return "BOM";
  return "PDF";
}

function FilePicker({ file, setFile, error }: { file: File | null; setFile: (f: File | null) => void; error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 text-sm transition-colors cursor-pointer ${drag ? "border-primary bg-primary/5" : error ? "border-danger" : "border-border-strong hover:border-primary/60"}`}
      >
        <FileUp className="size-6 text-muted" />
        {file ? (
          <span><span className="font-medium">{file.name}</span> <span className="text-muted">· {formatBytes(file.size)}</span></span>
        ) : (
          <span className="text-muted">Datei hierher ziehen oder <span className="text-primary">auswählen</span></span>
        )}
        <span className="text-2xs text-subtle">PDF, Zeichnungen (DWG/DXF), Bilder, Stücklisten, Text · max. {MAX_UPLOAD_BYTES / 1024 / 1024} MB</span>
      </button>
      <input ref={ref} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

export function UploadDocumentDialog({ projects, assemblies, initial, defaultOpen, trigger }: { projects: SelectOption[]; assemblies: AssemblyOpt[]; initial?: { projectId?: string; assemblyId?: string }; defaultOpen?: boolean; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(!!defaultOpen);
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [v, setV] = useState({ title: "", description: "", type: "PDF", category: "", tags: "", projectId: initial?.projectId ?? "", assemblyId: initial?.assemblyId ?? "" });
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));

  const submit = () => {
    if (!file) return setErrors({ file: "Bitte eine Datei auswählen." });
    if (file.size > MAX_UPLOAD_BYTES) return setErrors({ file: "Datei ist zu groß." });
    start(async () => {
      const fd = new FormData();
      Object.entries(v).forEach(([k, val]) => fd.set(k, val));
      fd.set("file", file);
      const res = await uploadDocument(fd);
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
        router.push(`/documents/${res.data!.id}`);
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o && defaultOpen) router.replace("/documents"); }}>
      <span className="contents" onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent title="Dokument hochladen" description="Datei wird im Dokumentenspeicher abgelegt und versioniert." size="lg">
        <form noValidate className="grid gap-4 sm:grid-cols-6" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <div className="sm:col-span-6">
            <FilePicker file={file} error={errors.file} setFile={(f) => { setFile(f); setErrors((e) => ({ ...e, file: "" })); if (f) setV((s) => ({ ...s, title: s.title || f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "), type: guessType(f) })); }} />
          </div>
          <Field label="Titel" required error={errors.title} className="sm:col-span-4"><Input value={v.title} onChange={(e) => set("title", e.target.value)} aria-invalid={!!errors.title} /></Field>
          <Field label="Dokumenttyp" className="sm:col-span-2"><Select value={v.type} onChange={(e) => set("type", e.target.value)} options={options(DOCUMENT_TYPE)} /></Field>
          <Field label="Kategorie" className="sm:col-span-3"><Input value={v.category} onChange={(e) => set("category", e.target.value)} placeholder="z. B. Konstruktion" /></Field>
          <Field label="Tags" hint="Kommagetrennt" className="sm:col-span-3"><Input value={v.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
          <Field label="Projekt" className="sm:col-span-3"><Select value={v.projectId} onChange={(e) => setV((s) => ({ ...s, projectId: e.target.value, assemblyId: "" }))} options={projects} placeholder="— keins —" /></Field>
          <Field label="Baugruppe" className="sm:col-span-3"><Select value={v.assemblyId} onChange={(e) => set("assemblyId", e.target.value)} options={assemblies.filter((a) => !v.projectId || a.projectId === v.projectId)} placeholder="— keine —" /></Field>
          <Field label="Beschreibung" className="sm:col-span-6"><Textarea value={v.description} onChange={(e) => set("description", e.target.value)} rows={2} /></Field>
          <DialogFooter className="sm:col-span-6">
            <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
            <Button type="submit" loading={pending}>{!pending && <Upload />} Hochladen</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewVersionDialog({ documentId, nextVersion, trigger }: { documentId: string; nextVersion: number; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const submit = () => {
    if (!file) return setErrors({ file: "Bitte eine Datei auswählen." });
    start(async () => {
      const fd = new FormData();
      fd.set("documentId", documentId);
      fd.set("changeNote", note);
      fd.set("file", file);
      const res = await uploadDocumentVersion(fd);
      if (res.ok) {
        toast.success(res.message);
        setOpen(false);
        setFile(null);
        setNote("");
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
      }
    });
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span className="contents" onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent title={`Neue Version ${nextVersion} hochladen`} description="Eine neue Version setzt den Status auf Draft – die Freigabe muss erneut erfolgen." >
        <div className="space-y-4">
          <FilePicker file={file} setFile={setFile} error={errors.file} />
          <Field label="Änderungsbeschreibung" required error={errors.changeNote}><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Was wurde geändert?" /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button onClick={submit} loading={pending}>Version hochladen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type DocumentMetaValues = { title: string; description: string; type: string; category: string; tags: string; projectId: string; assemblyId: string };

export function EditDocumentDialog({ id, initial, projects, assemblies, trigger }: { id: string; initial: DocumentMetaValues; projects: SelectOption[]; assemblies: AssemblyOpt[]; trigger: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const f = useActionForm<DocumentMetaValues>(initial);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span className="contents" onClick={() => setOpen(true)}>{trigger}</span>
      <DialogContent title="Metadaten bearbeiten" size="lg">
        <form noValidate className="grid gap-4 sm:grid-cols-6" onSubmit={(e) => { e.preventDefault(); f.submit((v) => updateDocument(id, v), { onSuccess: () => { setOpen(false); router.refresh(); } }); }}>
          <Field label="Titel" required error={f.errors.title} className="sm:col-span-4"><Input {...f.bind("title")} /></Field>
          <Field label="Dokumenttyp" className="sm:col-span-2"><Select {...f.bind("type")} options={options(DOCUMENT_TYPE)} /></Field>
          <Field label="Kategorie" className="sm:col-span-3"><Input {...f.bind("category")} /></Field>
          <Field label="Tags" hint="Kommagetrennt" className="sm:col-span-3"><Input {...f.bind("tags")} /></Field>
          <Field label="Projekt" className="sm:col-span-3"><Select {...f.bind("projectId")} onChange={(e) => f.setValues((s) => ({ ...s, projectId: e.target.value, assemblyId: "" }))} options={projects} placeholder="— keins —" /></Field>
          <Field label="Baugruppe" className="sm:col-span-3"><Select {...f.bind("assemblyId")} options={assemblies.filter((a) => !f.values.projectId || a.projectId === f.values.projectId)} placeholder="— keine —" /></Field>
          <Field label="Beschreibung" className="sm:col-span-6"><Textarea {...f.bind("description")} rows={3} /></Field>
          <DialogFooter className="sm:col-span-6"><Button variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button><Button type="submit" loading={f.pending}>Speichern</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
