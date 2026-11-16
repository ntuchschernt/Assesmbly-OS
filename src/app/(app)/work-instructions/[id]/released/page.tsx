import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, History, Lock, Printer } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { getPublishedRevision } from "@/lib/services/instructions";
import type { InstructionSnapshot } from "@/lib/services/instruction-snapshot";
import { buttonVariants } from "@/components/ui/button";
import { SetBreadcrumbs } from "@/components/layout/breadcrumbs";
import { ReleasedView } from "@/components/instructions/released-view";
import { PrintButton } from "@/components/instructions/print-button";
import { INSTRUCTION_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Freigegebene Montageanweisung" };

export default async function ReleasedPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ rev?: string }> }) {
  const { id } = await params;
  const { rev: revId } = await searchParams;
  const ctx = await requireContext();
  const wi = await db.workInstruction.findFirst({ where: { id, workspaceId: ctx.workspaceId }, select: { id: true, number: true, title: true, status: true, version: true } });
  if (!wi) notFound();
  const published = await getPublishedRevision(id);
  const historic = revId ? await db.instructionRevision.findFirst({ where: { id: revId, instructionId: id } }) : null;
  if (revId && !historic) notFound();

  const back = (
    <Link href={`/work-instructions/${id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg print:hidden"><ArrowLeft className="size-4" /> Zum Editor</Link>
  );
  const crumbs = <SetBreadcrumbs items={[{ label: "Work Instructions", href: "/work-instructions" }, { label: wi.number, href: `/work-instructions/${id}` }, { label: historic ? "Versionsansicht" : "Freigegebene Version" }]} />;

  // Viewing a specific revision from history
  if (historic) {
    const isValid = historic.status === "PUBLISHED" && published?.id === historic.id;
    return (
      <div className="mx-auto max-w-4xl">
        {crumbs}
        {back}
        {!isValid && (
          <div className="mb-4 flex gap-3 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            <History className="mt-0.5 size-4 shrink-0 text-danger" />
            <p><strong className="text-danger">Archivansicht – keine gültige Produktionsanweisung.</strong> <span className="text-muted">Version {historic.version}, Status „{INSTRUCTION_STATUS[historic.status].label}“, gespeichert am {formatDateTime(historic.createdAt)}.</span></p>
          </div>
        )}
        <ReleasedView snapshot={historic.snapshot as unknown as InstructionSnapshot} publishedAt={historic.createdAt} valid={isValid} />
      </div>
    );
  }

  if (!published) {
    return (
      <div className="mx-auto max-w-4xl">
        {crumbs}
        {back}
        <div className="rounded-lg border border-warning/40 bg-warning/5 p-8 text-center">
          <Lock className="mx-auto size-8 text-warning" />
          <h1 className="mt-3 text-lg font-semibold">Keine freigegebene Version</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {wi.number} „{wi.title}“ befindet sich im Status <strong>{INSTRUCTION_STATUS[wi.status].label}</strong>. Nicht freigegebene Montageanweisungen werden nicht als Produktionsanweisung dargestellt.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {crumbs}
      <div className="flex items-center justify-between print:hidden">
        {back}
        <PrintButton />
      </div>
      {wi.version > published.version && (
        <div className="mb-4 rounded-md border border-info/40 bg-info/10 px-4 py-2.5 text-sm text-muted print:hidden">
          Version {wi.version} ist in Bearbeitung ({INSTRUCTION_STATUS[wi.status].label}) und noch <strong>nicht gültig</strong>. Angezeigt wird die gültige Version {published.version}.
        </div>
      )}
      <ReleasedView snapshot={published.snapshot} publishedAt={published.createdAt} valid />
      <p className="mt-4 flex items-center gap-1.5 text-xs text-subtle print:hidden"><Printer className="size-3" /> Druck/PDF über die Browser-Druckfunktion. Ausgedruckte Exemplare unterliegen nicht der Versionslenkung.</p>
      <div className="mt-4 print:hidden"><Link href="/assembly" className={buttonVariants({ variant: "secondary", size: "sm" })}>Zu den Montageaufträgen</Link></div>
    </div>
  );
}
