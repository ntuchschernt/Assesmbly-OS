import Link from "next/link";
import { notFound } from "next/navigation";
import { Cog, FileText, ListChecks, Plus, ShieldCheck } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { getProject } from "@/lib/services/projects";
import { listWorkOrders } from "@/lib/services/work-orders";
import { linkOptions, listTasks } from "@/lib/services/tasks";
import { userOptions } from "@/lib/services/users";
import { projectProgress } from "@/lib/services/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { KeyValue, PageHeader, Progress, UserChip } from "@/components/ui/misc";
import { PriorityIndicator } from "@/components/ui/priority";
import { SetBreadcrumbs } from "@/components/layout/breadcrumbs";
import { ProjectActions } from "@/components/projects/project-actions";
import { toProjectValues } from "@/components/projects/project-values";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskTable } from "@/components/tasks/task-table";
import { ASSEMBLY_STATUS, DOCUMENT_STATUS, DOCUMENT_TYPE, MACHINE_STATUS, PROJECT_STATUS, QUALITY_STATUS, SEVERITY, WORK_ORDER_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const project = await getProject(ctx.workspaceId, id);
  if (!project) notFound();
  const [workOrders, users, links, tasks] = await Promise.all([
    listWorkOrders(ctx.workspaceId, { assembly: { machine: { projectId: id } } }),
    userOptions(),
    linkOptions(ctx.workspaceId),
    listTasks(ctx.workspaceId, { projectId: id }),
  ]);
  const tasksDone = project.tasks.filter((t) => t.status === "DONE").length;
  const progress = projectProgress({ status: project.status, tasksDone, tasksTotal: project.tasks.length, workOrderProgress: workOrders.map((w) => w.progress) });
  const openIssues = project.qualityIssues.filter((q) => !["RESOLVED", "CLOSED"].includes(q.status));

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Projects", href: "/projects" }, { label: `${project.key} · ${project.name}` }]} />
      <PageHeader
        meta={
          <>
            <span className="font-mono text-xs text-subtle">{project.key}</span>
            <StatusBadge meta={PROJECT_STATUS[project.status]} />
            <PriorityIndicator priority={project.priority} />
          </>
        }
        title={project.name}
        description={project.customer ? `Kunde: ${project.customer}` : undefined}
        actions={<ProjectActions id={project.id} archived={project.status === "ARCHIVED"} values={toProjectValues(project)} users={users} variant="buttons" />}
      />
      {project.status === "ARCHIVED" && (
        <div className="mb-6 rounded-md border border-border bg-elevated px-4 py-3 text-sm text-muted">Dieses Projekt ist archiviert und erscheint nicht mehr in aktiven Übersichten.</div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Fortschritt" value={`${progress}%`}><Progress value={progress} className="mt-2" tone={progress === 100 ? "success" : "orange"} /></Stat>
        <Stat label="Aufgaben erledigt" value={`${tasksDone} / ${project.tasks.length}`} />
        <Stat label="Montageaufträge" value={`${workOrders.filter((w) => w.status === "COMPLETED").length} / ${workOrders.length}`} />
        <Stat label="Offene QM-Meldungen" value={String(openIssues.length)} warn={openIssues.length > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader icon={<Cog />} title="Maschinen & Baugruppen" description="Zugeordnete Baugruppenhierarchie" action={<Link href={`/assembly?project=${project.id}`} className="text-xs text-primary hover:text-primary-hover">Im Assembly-Modul öffnen</Link>} />
            <CardContent className="space-y-4">
              {project.machines.length === 0 && <p className="text-sm text-muted">Noch keine Maschinen. Lege sie im <Link className="text-primary" href={`/assembly?project=${project.id}&newMachine=1`}>Assembly-Modul</Link> an.</p>}
              {project.machines.map((m) => (
                <div key={m.id} className="rounded-md border border-border">
                  <div className="flex items-center justify-between gap-2 border-b border-border bg-sidebar/50 px-3 py-2">
                    <span className="text-sm font-medium"><span className="mr-2 font-mono text-2xs text-subtle">{m.code}</span>{m.name}</span>
                    <StatusBadge meta={MACHINE_STATUS[m.status]} />
                  </div>
                  <ul className="divide-y divide-border">
                    {m.assemblies.map((a) => (
                      <li key={a.id} className="px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <Link href={`/assembly/assemblies/${a.id}`} className="text-sm hover:text-primary"><span className="mr-2 font-mono text-2xs text-subtle">{a.code}</span>{a.name}</Link>
                          <StatusBadge meta={ASSEMBLY_STATUS[a.status]} />
                        </div>
                        {a.children.length > 0 && (
                          <ul className="mt-1.5 space-y-1 border-l border-border pl-4">
                            {a.children.map((c) => (
                              <li key={c.id} className="flex items-center justify-between text-xs">
                                <Link href={`/assembly/assemblies/${c.id}`} className="text-muted hover:text-primary"><span className="mr-2 font-mono text-subtle">{c.code}</span>{c.name}</Link>
                                <StatusBadge meta={ASSEMBLY_STATUS[c.status]} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              icon={<ListChecks />}
              title="Aufgaben"
              description={`${project.tasks.length} Aufgaben`}
              action={<TaskFormDialog users={users} links={links} initial={{ projectId: project.id }} redirectOnCreate={false} trigger={<Button size="sm" variant="secondary"><Plus /> Aufgabe</Button>} />}
            />
            {tasks.length ? <TaskTable tasks={tasks} /> : <CardContent><p className="text-sm text-muted">Keine Aufgaben.</p></CardContent>}
          </Card>

          <Card>
            <CardHeader title="Montageaufträge" />
            {workOrders.length === 0 ? (
              <CardContent><p className="text-sm text-muted">Keine Montageaufträge.</p></CardContent>
            ) : (
              <ul className="divide-y divide-border">
                {workOrders.map((w) => (
                  <li key={w.id}>
                    <Link href={`/assembly/work-orders/${w.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated/40">
                      <span className="w-28 shrink-0 font-mono text-2xs text-subtle">{w.number}</span>
                      <span className="min-w-0 flex-1 truncate text-sm">{w.title}</span>
                      <span className="hidden w-32 sm:block"><Progress value={w.progress} tone={w.progress === 100 ? "success" : "orange"} /></span>
                      <StatusBadge meta={WORK_ORDER_STATUS[w.status]} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Projektdaten" />
            <CardContent className="divide-y divide-border py-1">
              <KeyValue label="Verantwortlich"><UserChip name={project.owner?.name} /></KeyValue>
              <KeyValue label="Start">{formatDate(project.startDate)}</KeyValue>
              <KeyValue label="Ende">{formatDate(project.endDate)}</KeyValue>
              <KeyValue label="Angelegt">{formatDate(project.createdAt)}</KeyValue>
            </CardContent>
            {project.description && <p className="border-t border-border px-4 py-3 text-sm leading-relaxed text-muted">{project.description}</p>}
          </Card>
          <Card>
            <CardHeader icon={<ShieldCheck />} title="Qualitätsmeldungen" action={<Link href={`/quality?project=${project.id}`} className="text-xs text-primary">Alle</Link>} />
            <ul className="divide-y divide-border">
              {project.qualityIssues.length === 0 && <li className="px-4 py-4 text-sm text-muted">Keine Meldungen.</li>}
              {project.qualityIssues.map((q) => (
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
            <CardHeader icon={<FileText />} title="Dokumente" action={<Link href={`/documents?project=${project.id}`} className="text-xs text-primary">Bibliothek</Link>} />
            <ul className="divide-y divide-border">
              {project.documents.length === 0 && <li className="px-4 py-4 text-sm text-muted">Keine Dokumente.</li>}
              {project.documents.map((d) => (
                <li key={d.id}>
                  <Link href={`/documents/${d.id}`} className="flex items-center gap-2 px-4 py-2.5 hover:bg-elevated/40">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{d.title}</span>
                      <span className="block text-2xs text-subtle">{d.number} · {DOCUMENT_TYPE[d.type].label}</span>
                    </span>
                    <StatusBadge meta={DOCUMENT_STATUS[d.status]} />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="border-t border-border p-3">
              <Link href={`/documents?upload=1&project=${project.id}`} className={buttonVariants({ variant: "secondary", size: "sm", className: "w-full" })}>
                <Plus /> Dokument hochladen
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, warn, children }: { label: string; value: string; warn?: boolean; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="label-caps">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-semibold ${warn ? "text-warning" : ""}`}>{value}</div>
      {children}
    </div>
  );
}
