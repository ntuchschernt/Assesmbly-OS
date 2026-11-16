import Link from "next/link";
import { notFound } from "next/navigation";
import { ListPlus, Pencil, Sparkles } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { getQualityIssue } from "@/lib/services/quality";
import { linkOptions } from "@/lib/services/tasks";
import { userOptions } from "@/lib/services/users";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyValue, PageHeader, UserChip } from "@/components/ui/misc";
import { SetBreadcrumbs } from "@/components/layout/breadcrumbs";
import { QualityFormDialog } from "@/components/quality/quality-form-dialog";
import { QualityActions, QualityStatusStepper } from "@/components/quality/quality-client";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { QUALITY_STATUS, QUALITY_TYPE, SEVERITY, TASK_STATUS } from "@/lib/constants";
import { formatDate, formatDateTime, isOverdue, toDateInput } from "@/lib/utils";

export default async function QualityIssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const [q, users, links] = await Promise.all([getQualityIssue(ctx.workspaceId, id), userOptions(), linkOptions(ctx.workspaceId)]);
  if (!q) notFound();
  const open = !["RESOLVED", "CLOSED"].includes(q.status);

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Quality Management", href: "/quality" }, { label: q.number }]} />
      <PageHeader
        meta={
          <>
            <span className="font-mono text-xs text-subtle">{q.number}</span>
            <StatusBadge meta={SEVERITY[q.severity]} />
            <StatusBadge meta={QUALITY_STATUS[q.status]} />
            <span className="text-xs text-muted">{QUALITY_TYPE[q.type].label}</span>
          </>
        }
        title={q.title}
        description={`Gemeldet von ${q.reporter?.name ?? "—"} am ${formatDateTime(q.createdAt)}`}
        actions={
          <>
            <Link href={`/copilot?q=${encodeURIComponent(`Fasse ${q.number} zusammen`)}`} className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs text-muted hover:bg-elevated hover:text-fg"><Sparkles className="size-3.5 text-primary" /> Zusammenfassen</Link>
            <TaskFormDialog
              users={users}
              links={links}
              initial={{ title: `${q.number}: ${q.title}`, description: q.description, priority: q.severity === "CRITICAL" ? "CRITICAL" : q.severity === "MAJOR" ? "HIGH" : "MEDIUM", labels: `Qualität, ${q.number}`, projectId: q.project?.id ?? "", assemblyId: q.assembly?.id ?? "", workOrderId: q.workOrder?.id ?? "", assigneeId: q.assignee?.id ?? "", dueDate: toDateInput(q.dueDate) }}
              trigger={<Button size="sm" variant="secondary"><ListPlus /> Aufgabe erstellen</Button>}
            />
            <QualityFormDialog
              issueId={q.id}
              users={users}
              links={links}
              initial={{ title: q.title, description: q.description, type: q.type, severity: q.severity, rootCause: q.rootCause ?? "", assigneeId: q.assignee?.id ?? "", dueDate: toDateInput(q.dueDate), projectId: q.project?.id ?? "", machineId: q.machine?.id ?? "", assemblyId: q.assembly?.id ?? "", workOrderId: q.workOrder?.id ?? "", taskId: q.task?.id ?? "", documentId: q.document?.id ?? "" }}
              trigger={<Button size="sm"><Pencil /> Bearbeiten</Button>}
            />
          </>
        }
      />
      <div className="mb-6"><QualityStatusStepper id={q.id} status={q.status} /></div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Befund" />
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{q.description}</p>
              <div className="rounded-md border border-border bg-elevated/40 p-3">
                <div className="label-caps mb-1">Ursache (Root Cause)</div>
                <p className="text-sm">{q.rootCause ?? <span className="text-muted">Noch nicht ermittelt – über „Bearbeiten“ dokumentieren.</span>}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Maßnahmen & Prüfungen" description={`${q.actions.filter((a) => a.done).length} von ${q.actions.length} erledigt`} />
            <QualityActions
              issueId={q.id}
              users={users}
              actions={q.actions.map((a) => ({ id: a.id, title: a.title, type: a.type, assignee: a.assignee?.name ?? null, dueDate: a.dueDate?.toISOString() ?? null, done: a.done, result: a.result }))}
            />
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Verantwortung" />
            <CardContent className="divide-y divide-border py-1">
              <KeyValue label="Verantwortlich"><UserChip name={q.assignee?.name} /></KeyValue>
              <KeyValue label="Frist"><span className={isOverdue(q.dueDate, !open) ? "text-danger" : ""}>{formatDate(q.dueDate)}</span></KeyValue>
              <KeyValue label="Gelöst am">{formatDate(q.resolvedAt)}</KeyValue>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Verknüpfungen" />
            <CardContent className="divide-y divide-border py-1">
              <KeyValue label="Projekt">{q.project ? <Link className="hover:text-primary" href={`/projects/${q.project.id}`}>{q.project.key} · {q.project.name}</Link> : "—"}</KeyValue>
              <KeyValue label="Maschine">{q.machine ? <Link className="hover:text-primary" href={`/assembly?machine=${q.machine.id}`}>{q.machine.code}</Link> : "—"}</KeyValue>
              <KeyValue label="Baugruppe">{q.assembly ? <Link className="hover:text-primary" href={`/assembly/assemblies/${q.assembly.id}`}>{q.assembly.code} · {q.assembly.name}</Link> : "—"}</KeyValue>
              <KeyValue label="Montageauftrag">{q.workOrder ? <Link className="hover:text-primary" href={`/assembly/work-orders/${q.workOrder.id}`}>{q.workOrder.number}</Link> : "—"}</KeyValue>
              <KeyValue label="Aufgabe">{q.task ? <Link className="inline-flex items-center gap-2 hover:text-primary" href={`/tasks/${q.task.id}`}>TSK-{q.task.number} <StatusBadge meta={TASK_STATUS[q.task.status]} /></Link> : "—"}</KeyValue>
              <KeyValue label="Dokument">{q.document ? <Link className="hover:text-primary" href={`/documents/${q.document.id}`}>{q.document.number}</Link> : "—"}</KeyValue>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
