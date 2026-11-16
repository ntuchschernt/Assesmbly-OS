import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, HardHat, Lock, Package, Wrench } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { listWorkOrders } from "@/lib/services/work-orders";
import { getPublishedRevision } from "@/lib/services/instructions";
import { linkOptions } from "@/lib/services/tasks";
import { userOptions } from "@/lib/services/users";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/misc";
import { SetBreadcrumbs } from "@/components/layout/breadcrumbs";
import { StepRunner } from "@/components/assembly/step-runner";
import { WorkOrderStatusActions } from "@/components/assembly/work-order-client";
import { WORK_ORDER_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Montageausführung" };

export default async function ExecutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const [wo] = await listWorkOrders(ctx.workspaceId, { id });
  if (!wo) notFound();
  const rev = wo.workInstructionId ? await getPublishedRevision(wo.workInstructionId) : null;
  const crumbs = <SetBreadcrumbs items={[{ label: "Assembly", href: "/assembly" }, { label: wo.number, href: `/assembly/work-orders/${wo.id}` }, { label: "Ausführung" }]} />;

  // Safety rule: only a PUBLISHED revision may be shown as a production instruction.
  if (!rev) {
    return (
      <>
        {crumbs}
        <div className="mx-auto mt-10 max-w-lg rounded-lg border border-warning/40 bg-warning/5 p-8 text-center">
          <Lock className="mx-auto size-8 text-warning" />
          <h1 className="mt-3 text-lg font-semibold">Ausführung gesperrt</h1>
          <p className="mt-2 text-sm text-muted">
            Für {wo.number} liegt keine veröffentlichte Montageanweisung vor. Nicht freigegebene Inhalte werden in der Produktion nicht angezeigt.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href={`/assembly/work-orders/${wo.id}`} className={buttonVariants({ variant: "secondary" })}>Zum Auftrag</Link>
            {wo.workInstruction && <Link href={`/work-instructions/${wo.workInstruction.id}`} className={buttonVariants()}>Anweisung öffnen</Link>}
          </div>
        </div>
      </>
    );
  }

  const [execs, users, links] = await Promise.all([
    db.stepExecution.findMany({ where: { workOrderId: wo.id }, include: { completedBy: { select: { name: true } } } }),
    userOptions(),
    linkOptions(ctx.workspaceId),
  ]);
  const snap = rev.snapshot;
  const editable = wo.status === "IN_PROGRESS";

  return (
    <div className="mx-auto max-w-4xl">
      {crumbs}
      <Link href={`/assembly/work-orders/${wo.id}`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"><ArrowLeft className="size-4" /> Zurück zum Auftrag</Link>

      <header className="mb-4 rounded-lg border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-subtle">{wo.number}</span>
          <StatusBadge meta={WORK_ORDER_STATUS[wo.status]} />
        </div>
        <h1 className="mt-1 text-xl font-semibold sm:text-2xl">{snap.title}</h1>
        <p className="mt-1 text-sm text-muted">{wo.assembly.code} {wo.assembly.name} · {wo.assembly.machine.name}</p>
        <div className="mt-4 flex items-center gap-3">
          <Progress value={wo.progress} tone={wo.progress === 100 ? "success" : "orange"} className="h-2" />
          <span className="shrink-0 font-mono text-sm">{wo.doneSteps}/{wo.totalSteps}</span>
        </div>
        {!editable && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-elevated px-3 py-2 text-sm">
            <span className="text-muted">{wo.status === "COMPLETED" ? "Auftrag abgeschlossen – Ansicht schreibgeschützt." : "Auftrag starten, um Schritte zu erfassen."}</span>
            <div className="flex gap-2"><WorkOrderStatusActions id={wo.id} status={wo.status} /></div>
          </div>
        )}
        {editable && wo.totalSteps > 0 && wo.doneSteps === wo.totalSteps && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm">
            <span className="text-success">Alle Schritte i.O. – Auftrag kann abgeschlossen werden.</span>
            <div className="flex gap-2"><WorkOrderStatusActions id={wo.id} status={wo.status} /></div>
          </div>
        )}
      </header>

      <div className="mb-4 flex items-start gap-3 rounded-lg border border-success/40 bg-success/5 px-4 py-3 text-sm">
        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-success" />
        <div>
          <p className="font-medium text-success">Freigegebene Produktionsanweisung {snap.number} · Version {rev.version}</p>
          <p className="text-muted">Veröffentlicht am {formatDate(rev.createdAt)}{snap.approvedByName && ` · Freigabe: ${snap.approvedByName}`}</p>
        </div>
      </div>

      {snap.safetyNotes && (
        <div className="mb-4 flex gap-3 rounded-lg border border-warning/50 bg-warning/10 px-4 py-3 text-sm">
          <HardHat className="mt-0.5 size-5 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-warning">Sicherheitshinweise</p>
            <p className="mt-0.5 leading-relaxed text-fg/90">{snap.safetyNotes}</p>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="label-caps mb-2 flex items-center gap-1.5"><Wrench className="size-3" /> Werkzeuge</div>
          <ul className="space-y-1 text-sm">{snap.tools.map((t) => <li key={t}>{t}</li>)}{!snap.tools.length && <li className="text-muted">—</li>}</ul>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="label-caps mb-2 flex items-center gap-1.5"><Package className="size-3" /> Material</div>
          <ul className="space-y-1 text-sm">{snap.materials.map((t) => <li key={t}>{t}</li>)}{!snap.materials.length && <li className="text-muted">—</li>}</ul>
        </div>
      </div>

      <StepRunner
        workOrderId={wo.id}
        steps={snap.steps}
        editable={editable}
        executions={Object.fromEntries(execs.map((e) => [e.stepId, { status: e.status, resultNote: e.resultNote, completedBy: e.completedBy?.name ?? null, completedAt: e.completedAt?.toISOString() ?? null }]))}
        qualityContext={{ users, links, initial: { projectId: wo.assembly.machine.project.id, machineId: wo.assembly.machine.id, assemblyId: wo.assembly.id, workOrderId: wo.id } }}
      />
    </div>
  );
}
