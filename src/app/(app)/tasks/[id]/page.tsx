import Link from "next/link";
import { notFound } from "next/navigation";
import { requireContext } from "@/lib/auth/context";
import { getTask, linkOptions } from "@/lib/services/tasks";
import { userOptions } from "@/lib/services/users";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Avatar, KeyValue, PageHeader, UserChip } from "@/components/ui/misc";
import { PriorityIndicator } from "@/components/ui/priority";
import { SetBreadcrumbs } from "@/components/layout/breadcrumbs";
import { Attachments, CommentForm, TaskHeaderActions } from "@/components/tasks/task-detail-client";
import { QUALITY_STATUS, TASK_STATUS } from "@/lib/constants";
import { formatDate, formatDateTime, isOverdue, relativeTime, toDateInput } from "@/lib/utils";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const [task, users, links] = await Promise.all([getTask(ctx.workspaceId, id), userOptions(), linkOptions(ctx.workspaceId)]);
  if (!task) notFound();
  const overdue = isOverdue(task.dueDate, task.status === "DONE");
  const values = {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId ?? "",
    dueDate: toDateInput(task.dueDate),
    labels: task.labels.join(", "),
    projectId: task.projectId ?? "",
    assemblyId: task.assemblyId ?? "",
    workOrderId: task.workOrderId ?? "",
  };

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Tasks", href: "/tasks" }, { label: `TSK-${task.number}` }]} />
      <PageHeader
        meta={
          <>
            <span className="font-mono text-xs text-subtle">TSK-{task.number}</span>
            <StatusBadge meta={TASK_STATUS[task.status]} />
            <PriorityIndicator priority={task.priority} />
          </>
        }
        title={task.title}
        actions={<TaskHeaderActions id={task.id} number={task.number} values={values} users={users} links={links} />}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Beschreibung" />
            <CardContent>
              {task.description ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg/90">{task.description}</p> : <p className="text-sm text-muted">Keine Beschreibung.</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Kommentare" description={`${task.comments.length} Kommentar(e)`} />
            <CardContent>
              <ul className="space-y-4">
                {task.comments.map((c) => (
                  <li key={c.id} className="flex gap-3">
                    <Avatar name={c.author.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs">
                        <span className="font-medium text-fg">{c.author.name}</span> <span className="text-subtle" title={formatDateTime(c.createdAt)}>· {relativeTime(c.createdAt)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-fg/90">{c.body}</p>
                    </div>
                  </li>
                ))}
                {task.comments.length === 0 && <li className="text-sm text-muted">Noch keine Kommentare.</li>}
              </ul>
              <CommentForm taskId={task.id} />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardContent className="divide-y divide-border py-1">
              <KeyValue label="Verantwortlich"><UserChip name={task.assignee?.name} /></KeyValue>
              <KeyValue label="Gemeldet von">{task.reporter?.name ?? "—"}</KeyValue>
              <KeyValue label="Fällig"><span className={overdue ? "text-danger" : ""}>{formatDate(task.dueDate)}{overdue && " · überfällig"}</span></KeyValue>
              <KeyValue label="Erstellt">{formatDate(task.createdAt)}</KeyValue>
              {task.completedAt && <KeyValue label="Erledigt">{formatDate(task.completedAt)}</KeyValue>}
              <KeyValue label="Labels">
                <span className="flex flex-wrap justify-end gap-1">{task.labels.length ? task.labels.map((l) => <Tag key={l}>{l}</Tag>) : "—"}</span>
              </KeyValue>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Verknüpfungen" />
            <CardContent className="divide-y divide-border py-1">
              <KeyValue label="Projekt">{task.project ? <Link className="hover:text-primary" href={`/projects/${task.project.id}`}>{task.project.key} · {task.project.name}</Link> : "—"}</KeyValue>
              <KeyValue label="Baugruppe">{task.assembly ? <Link className="hover:text-primary" href={`/assembly/assemblies/${task.assembly.id}`}>{task.assembly.code} · {task.assembly.name}</Link> : "—"}</KeyValue>
              <KeyValue label="Montageauftrag">{task.workOrder ? <Link className="hover:text-primary" href={`/assembly/work-orders/${task.workOrder.id}`}>{task.workOrder.number}</Link> : "—"}</KeyValue>
              <KeyValue label="Qualitätsmeldungen">
                {task.qualityIssues.length ? (
                  <span className="flex flex-col items-end gap-1">
                    {task.qualityIssues.map((q) => (
                      <Link key={q.id} href={`/quality/${q.id}`} className="inline-flex items-center gap-2 hover:text-primary">
                        <span className="font-mono text-2xs">{q.number}</span>
                        <StatusBadge meta={QUALITY_STATUS[q.status]} />
                      </Link>
                    ))}
                  </span>
                ) : (
                  "—"
                )}
              </KeyValue>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Anhänge" />
            <CardContent>
              <Attachments
                taskId={task.id}
                attachments={task.attachments.map((a) => ({ id: a.id, fileName: a.fileName, size: a.size, storageKey: a.storageKey, createdAt: a.createdAt.toISOString(), uploadedBy: a.uploadedBy?.name ?? null }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
