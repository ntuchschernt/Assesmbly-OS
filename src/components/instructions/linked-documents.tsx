"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, type SelectOption } from "@/components/ui/input";
import { useAction } from "@/components/ui/use-action-form";
import { linkDocumentToInstruction } from "@/actions/instructions";

export function LinkedDocuments({ instructionId, linked, available }: { instructionId: string; linked: { id: string; number: string; title: string; status: string }[]; available: SelectOption[] }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const [docId, setDocId] = useState("");
  return (
    <div>
      <ul className="mb-3 space-y-1.5">
        {linked.length === 0 && <li className="text-xs text-muted">Keine Dokumente verknüpft.</li>}
        {linked.map((d) => (
          <li key={d.id} className="flex items-center gap-2 text-sm">
            <Link href={`/documents/${d.id}`} className="min-w-0 flex-1 truncate hover:text-primary"><span className="mr-1.5 font-mono text-2xs text-subtle">{d.number}</span>{d.title}</Link>
            <button className="rounded p-1 text-subtle hover:text-danger cursor-pointer" aria-label="Verknüpfung entfernen" onClick={() => run(() => linkDocumentToInstruction(instructionId, d.id, false), { onSuccess: () => router.refresh() })}><X className="size-3.5" /></button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Select value={docId} onChange={(e) => setDocId(e.target.value)} options={available} placeholder="Dokument wählen…" className="h-8 text-xs" />
        <Button size="sm" variant="secondary" disabled={!docId} loading={pending} onClick={() => run(() => linkDocumentToInstruction(instructionId, docId, true), { onSuccess: () => { setDocId(""); router.refresh(); } })}><Link2 /></Button>
      </div>
    </div>
  );
}
