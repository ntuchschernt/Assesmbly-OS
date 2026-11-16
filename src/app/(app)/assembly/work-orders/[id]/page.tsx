import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, Circle, Clock, Lock, Pencil, PlayCircle, ShieldAlert, XCircle } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { listWorkOrders } from "@/lib/services/work-orders";
import { getPublishedRevision } from "@/lib/services/instructions";
import { assemblyFormOptions } from "@/lib/services/assembly-options";
import { linkOptions } from "@/lib/services/tasks";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { KeyValue, PageHeader, Progress, UserChip } from "@/components/ui/misc";
import { PriorityIndicator } from "@/components/ui/priority";
import { SetBreadcrumbs } from "@/components/layout/breadcrumbs";
import { WorkOrderFormDialog } from "@/components/assembly/assembly-forms";
import { DeleteTimeEntryButton, TimeLogForm, WorkOrderStatusActions } from "@/components/assembly/work-order-client";
import { QualityFormDialog } from "@/components/quality/quality-form-dialog";
import { INSTRUCTION_STATUS, QUALITY_STATUS, SEVERITY, TASK_STATUS, WORK_ORDER_STATUS } from "@/lib/constants";
import { formatDate, formatDateTime, formatHours, toDateInput } from "@/lib/utils";

export default async function WorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const [wo] = await listWorkOrders(ctx.workspaceId, { id });
  if (!wo) notFound();
  const [details, rev, opts, links] = await Promise.all([
    db.workOrder.findUnique({
      where: { id },
      include: {
        timeEntries: { orderBy: { date: "desc" }, include: { user: { select: { name: true } } } },
        stepExecutions: { include: { completedBy: { select: { name: true } } } },
        qualityIssues: { orderBy: { createdAt: "desc" } },
        tasks: { include: { assignee: { select: { name: true } } } },
      },
    }),
    wo.workInstructionId ? getPublishedRevision(wo.workInstructionId) : Promise.resolve(null),
    assemblyFormOptions(ctx.workspaceId),
    linkOptions(ctx.workspaceId),
  ]);
  const execs = new Map(details!.stepExecutions.map((e) => [e.stepId, e]));
  const project = wo.assembly.machine.project;
  const blockedByInstruction = !!wo.workInstruction && !rev;
  const canExecute = !!rev && wo.status === "IN_PROGRESS";

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Assembly", href: "/assembly" }, { label: wo.assembly.code, href: `/assembly/assemblies/${wo.assembly.id}` }, { label: wo.number }]} />
      <PageHeader
        meta={
          <>
            <span className="font-mono text-xs text-subtle">{wo.number}</span>
            <StatusBadge meta={WORK_ORDER_STATUS[wo.status]} />
            <PriorityIndicator priority={wo.priority} />
          </>
        }
        title={wo.title}
        description={
          <>
            <Link href={`/projects/${project.id}`} className="hover:text-fg">{project.key}</Link> › {wo.assembly.machine.code} › <Link href={`/assembly/assemblies/${wo.assembly.id}`} className="hover:text-fg">{wo.assembly.code} {wo.assembly.name}</Link>
          </>
        }
        actions={
          <>
            {wo.status !== "COMPLETED" && (
              <WorkOrderFormDialog
                id={wo.id}
                assemblies={opts.assemblies}
                instructions={opts.instructions}
                users={opts.users}
                initial={{ assemblyId: wo.assemblyId, workInstructionId: wo.workInstructionId ?? "", title: wo.title, description: wo.description ?? "", priority: wo.priority, assigneeId: wo.assigneeId ?? "", plannedHours: String(wo.plannedHours), dueDate: toDateInput(wo.dueDate) }}
                trigger={<Button variant="secondary" size="sm"><Pencil /> Bearbeiten</Button>}
              />
            )}
            <QualityFormDialog users={opts.users} links={links} title={`Problem zu ${wo.number} dokumentieren`} initial={{ projectId: project.id, machineId: wo.assembly.machine.id, assemblyId: wo.assembly.id, workOrderId: wo.id }} trigger={<Button variant="secondary" size="sm"><ShieldAlert /> Problem melden</Button>} />
            <WorkOrderStatusActions id={wo.id} status={wo.status} />
          </>
        }
      />

      {blockedByInstruction && (
        <div className="mb-6 flex gap-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm">
          <Lock className="mt-0.5 size-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium text-warning">Keine gültige Produktionsanweisung</p>
            <p className="text-muted">
              {wo.workInstruction!.number} hat Status <strong>{INSTRUCTION_STATUS[wo.workInstruction!.status].label}</strong> und wurde noch nie veröffentlicht. Start und Ausführung sind gesperrt, bis eine freigegebene Version vorliegt.
            </p>
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="label-caps">Fortschritt</div>
          <div className="mt-2 font-mono text-2xl font-semibold">{wo.progress}%</div>
          <Progress value={wo.progress} className="mt-2" tone={wo.progress === 100 ? "success" : "orange"} />
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="label-caps">Arbeitsschritte</div>
          <div className="mt-2 font-mono text-2xl font-semibold">{wo.doneSteps} / {wo.totalSteps}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="label-caps">Zeit Ist / Plan</div>
          <div className={`mt-2 font-mono text-2xl font-semibold ${wo.loggedMinutes / 60 > wo.plannedHours ? "text-warning" : ""}`}>{formatHours(wo.loggedMinutes)}</div>
          <div className="text-xs text-subtle">Plan {wo.plannedHours.toString().replace(".", ",")} h</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="label-caps">Qualitätsmeldungen</div>
          <div className={`mt-2 font-mono text-2xl font-semibold ${details!.qualityIssues.some((q) => !["RESOLVED", "CLOSED"].includes(q.status)) ? "text-danger" : ""}`}>{details!.qualityIssues.length}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Arbeitsschritte"
              description={rev ? `Gültige Version: ${rev.snapshot.number} v${rev.version} (veröffentlicht ${formatDate(rev.createdAt)})` : wo.workInstruction ? "Keine veröffentlichte Version" : "Keine Montageanweisung verknüpft"}
              action={
                rev ? (
                  <Link href={`/assembly/work-orders/${wo.id}/execute`} className={buttonVariants({ size: "sm", variant: canExecute ? "primary" : "secondary" })}>
                    <PlayCircle /> Montage ausführen
                  </Link>
                ) : null
              }
            />
            {rev && wo.status !== "IN_PROGRESS" && wo.status !== "COMPLETED" && (
              <p className="border-b border-border bg-elevated/40 px-4 py-2 text-xs text-muted">Schritte können erfasst werden, sobald der Auftrag gestartet ist.</p>
            )}
            {rev ? (
              <ol className="divide-y divide-border">
                {rev.snapshot.steps.map((s) => {
                  const e = execs.get(s.id);
                  return (
                    <li key={s.id} className="flex gap-3 px-4 py-3">
                      {e?.status === "DONE" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : e?.status === "FAILED" ? <XCircle className="mt-0.5 size-4 shrink-0 text-danger" /> : <Circle className="mt-0.5 size-4 shrink-0 text-subtle" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-mono text-2xs text-subtle">{String(s.order).padStart(2, "0")}</span>
                          <span className="font-medium">{s.title}</span>
                          {s.isCheckpoint && <Badge tone="info">Prüfpunkt</Badge>}
                          {s.safetyCritical && <Badge tone="danger">Sicherheitskritisch</Badge>}
                        </div>
                        {e && e.status !== "PENDING" && (
                          <p className="mt-1 text-xs text-muted">
                            {e.status === "DONE" ? "i.O." : "nicht i.O."} · {e.completedBy?.name} · {formatDateTime(e.completedAt)}
                            {e.resultNote && <> · <span className="text-fg/80">„{e.resultNote}“</span></>}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <CardContent><p className="text-sm text-muted">Fortschritt wird ohne veröffentlichte Anweisung über erfasste Zeit geschätzt (max. 90 %).</p></CardContent>
            )}
          </Card>

          <Card>
            <CardHeader icon={<Clock />} title="Montagezeiten" description={`${details!.timeEntries.length} Einträge · gesamt ${formatHours(wo.loggedMinutes)}`} />
            <CardContent>
              <TimeLogForm workOrderId={wo.id} disabled={wo.status === "PLANNED" || wo.status === "COMPLETED"} />
              {wo.status === "PLANNED" && <p className="mt-2 text-xs text-subtle">Zeiterfassung ist nach Freigabe des Auftrags möglich.</p>}
              <ul className="mt-4 divide-y divide-border border-t border-border">
                {details!.timeEntries.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
                    <span className="w-16 font-mono text-xs">{formatHours(t.minutes)}</span>
                    <span className="min-w-0 flex-1 truncate">{t.note ?? "—"}</span>
                    <span className="hidden text-xs text-muted sm:inline">{t.user.name}</span>
                    <span className="font-mono text-2xs text-subtle">{formatDate(t.date)}</span>
                    {wo.status !== "COMPLETED" && <DeleteTimeEntryButton id={t.id} />}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Auftragsdaten" />
            <CardContent className="divide-y divide-border py-1">
              <KeyValue label="Verantwortlich"><UserChip name={wo.assignee?.name} /></KeyValue>
              <KeyValue label="Fällig">{formatDate(wo.dueDate)}</KeyValue>
              <KeyValue label="Gestartet">{formatDateTime(wo.startedAt)}</KeyValue>
              <KeyValue label="Abgeschlossen">{formatDateTime(wo.completedAt)}</KeyValue>
              <KeyValue label="Anweisung">
                {wo.workInstruction ? (
                  <Link href={`/work-instructions/${wo.workInstruction.id}`} className="hover:text-primary">{wo.workInstruction.number} · Arbeitskopie v{wo.workInstruction.version} ({INSTRUCTION_STATUS[wo.workInstruction.status].label})</Link>
                ) : "—"}
              </KeyValue>
            </CardContent>
            {wo.description && <p className="border-t border-border px-4 py-3 text-sm text-muted">{wo.description}</p>}
          </Card>
          <Card>
            <CardHeader icon={<AlertTriangle />} title="Probleme / Qualitätsmeldungen" />
            <ul className="divide-y divide-border">
              {details!.qualityIssues.length === 0 && <li className="px-4 py-4 text-sm text-muted">Keine Probleme dokumentiert.</li>}
              {details!.qualityIssues.map((q) => (
                <li key={q.id}>
                  <Link href={`/quality/${q.id}`} className="block px-4 py-2.5 hover:bg-elevated/40">
                    <div className="flex items-center gap-2"><span className="font-mono text-2xs text-subtle">{q.number}</span><StatusBadge meta={SEVERITY[q.severity]} /><StatusBadge meta={QUALITY_STATUS[q.status]} /></div>
                    <div className="mt-1 truncate text-sm">{q.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Aufgaben" />
            <ul className="divide-y divide-border">
              {details!.tasks.length === 0 && <li className="px-4 py-4 text-sm text-muted">Keine Aufgaben.</li>}
              {details!.tasks.map((t) => (
                <li key={t.id}>
                  <Link href={`/tasks/${t.id}`} className="flex items-center gap-2 px-4 py-2.5 hover:bg-elevated/40">
                    <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                    <StatusBadge meta={TASK_STATUS[t.status]} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
