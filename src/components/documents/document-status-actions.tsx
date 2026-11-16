"use client";

import { useRouter } from "next/navigation";
import { Archive, BadgeCheck, Send, Undo2 } from "lucide-react";
import type { DocumentStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/use-action-form";
import { setDocumentStatus } from "@/actions/documents";

export function DocumentStatusActions({ id, status, canApprove }: { id: string; status: DocumentStatus; canApprove: boolean }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const go = (s: DocumentStatus) => run(() => setDocumentStatus(id, s), { onSuccess: () => router.refresh() });
  return (
    <>
      {status === "DRAFT" && <Button size="sm" onClick={() => go("REVIEW")} loading={pending}><Send /> Zur Freigabe einreichen</Button>}
      {status === "REVIEW" && (
        <>
          <Button size="sm" variant="secondary" onClick={() => go("DRAFT")} disabled={pending}><Undo2 /> Zurück an Draft</Button>
          <Button size="sm" onClick={() => go("APPROVED")} loading={pending} disabled={!canApprove} title={canApprove ? undefined : "Keine Freigabeberechtigung"}><BadgeCheck /> Freigeben</Button>
        </>
      )}
      {status !== "ARCHIVED" && <Button size="sm" variant="ghost" onClick={() => go("ARCHIVED")} disabled={pending}><Archive /> Archivieren</Button>}
      {status === "ARCHIVED" && <Button size="sm" variant="secondary" onClick={() => go("DRAFT")} loading={pending}><Undo2 /> Reaktivieren</Button>}
    </>
  );
}
