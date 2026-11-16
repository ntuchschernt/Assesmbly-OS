import Link from "next/link";
import { notFound } from "next/navigation";
import { Boxes, ClipboardPlus, FileText, ListChecks, Pencil, Plus, ShieldAlert, ClipboardList } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { getAssembly } from "@/lib/services/assembly";
import { assemblyFormOptions } from "@/lib/services/assembly-options";
import { listWorkOrders } from "@/lib/services/work-orders";
import { linkOptions } from "@/lib/services/tasks";
import { average } from "@/lib/services/progress";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyValue, PageHeader, Progress, UserChip } from "@/components/ui/misc";
import { SetBreadcrumbs } from "@/components/layout/breadcrumbs";
import { AssemblyFormDialog, WorkOrderFormDialog } from "@/components/assembly/assembly-forms";
import { WorkOrderTable } from "@/components/assembly/work-order-table";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { QualityFormDialog } from "@/components/quality/quality-form-dialog";
import { ASSEMBLY_STATUS, DOCUMENT_STATUS, DOCUMENT_TYPE, INSTRUCTION_STATUS, QUALITY_STATUS, SEVERITY, TASK_STATUS } from "@/lib/constants";

export default async function AssemblyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const a = await getAssembly(ctx.workspaceId, id);
  if (!a) notFound();
  const [orders, opts, links] = await Promise.all([
    listWorkOrders(ctx.workspaceId, { OR: [{ assemblyId: a.id }, { assembly: { parentId: a.id } }] }),
    assemblyFormOptions(ctx.workspaceId),
    linkOptions(ctx.workspaceId),
  ]);
  const progress = a.status === "COMPLETED" ? 100 : average(orders.map((o) => o.progress));
  const project = a.machine.project;

  return (
    <>
      <SetBreadcrumbs
        items={[
          { label: "Assembly", href: "/assembly" },
          { label: a.machine.code, href: `/assembly?machine=${a.machine.id}` },
          ...(a.parent ? [{ label: a.parent.code, href: `/assembly/assemblies/${a.parent.id}` }] : []),
          { label: `${a.code} ${a.name}` },
        ]}
      />
      <PageHeader
        meta={
          <>
            <span className="font-mono text-xs text-subtle">{a.code}</span>
            <StatusBadge meta={ASSEMBLY_STATUS[a.status]} />
            <span className="text-xs text-muted">{a.parent ? "Unterbaugruppe" : "Baugruppe"}</span>
          </>
        }
        title={a.name}
        description={
          <>
            <Link href={`/projects/${project.id}`} className="hover:text-fg">{project.key} {project.name}</Link> › <Link href={`/assembly?machine=${a.machine.id}`} className="hover:text-fg">{a.machine.name}</Link>
            {a.parent && <> › <Link href={`/assembly/assemblies/${a.parent.id}`} className="hover:text-fg">{a.parent.name}</Link></>}
          </>
        }
        actions={
          <>
            <QualityFormDialog users={opts.users} links={links} title="Problem dokumentieren" initial={{ projectId: project.id, machineId: a.machine.id, assemblyId: a.id }} trigger={<Button variant="secondary" size="sm"><ShieldAlert /> Problem melden</Button>} />
            <AssemblyFormDialog
              id={a.id}
              machines={opts.machines}
              parents={opts.parents}
              users={opts.users}
              initial={{ machineId: a.machineId, parentId: a.parentId ?? "", code: a.code, name: a.name, description: a.description ?? "", status: a.status, responsibleId: a.responsibleId ?? "" }}
              trigger={<Button variant="secondary" size="sm"><Pencil /> Bearbeiten</Button>}
            />
            <WorkOrderFormDialog assemblies={opts.assemblies} instructions={opts.instructions} users={opts.users} initial={{ assemblyId: a.id }} trigger={<Button size="sm"><ClipboardPlus /> Montageauftrag</Button>} />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Montageaufträge" description={`${orders.length} Aufträge (inkl. Unterbaugruppen) · Fortschritt ${progress}%`} />
            {orders.length ? <WorkOrderTable orders={orders} /> : <CardContent><p className="text-sm text-muted">Noch keine Montageaufträge für diese Baugruppe.</p></CardContent>}
          </Card>
          {!a.parent && (
            <Card>
              <CardHeader
                icon={<Boxes />}
                title="Unterbaugruppen"
                action={<AssemblyFormDialog machines={opts.machines} parents={opts.parents} users={opts.users} initial={{ machineId: a.machineId, parentId: a.id }} trigger={<Button size="sm" variant="secondary"><Plus /> Unterbaugruppe</Button>} />}
              />
              <ul className="divide-y divide-border">
                {a.children.length === 0 && <li className="px-4 py-4 text-sm text-muted">Keine Unterbaugruppen.</li>}
                {a.children.map((c) => (
                  <li key={c.id}>
                    <Link href={`/assembly/assemblies/${c.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated/40">
                      <span className="w-20 font-mono text-2xs text-subtle">{c.code}</span>
                      <span className="flex-1 text-sm">{c.name}</span>
                      <span className="hidden text-xs text-muted sm:inline">{c.responsible?.name}</span>
                      <StatusBadge meta={ASSEMBLY_STATUS[c.status]} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card>
            <CardHeader
              icon={<ListChecks />}
              title="Aufgaben"
              action={<TaskFormDialog users={opts.users} links={links} initial={{ projectId: project.id, assemblyId: a.id }} redirectOnCreate={false} trigger={<Button size="sm" variant="secondary"><Plus /> Aufgabe</Button>} />}
            />
            <ul className="divide-y divide-border">
              {a.tasks.length === 0 && <li className="px-4 py-4 text-sm text-muted">Keine Aufgaben verknüpft.</li>}
              {a.tasks.map((t) => (
                <li key={t.id}>
                  <Link href={`/tasks/${t.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated/40">
                    <span className="w-14 font-mono text-2xs text-subtle">TSK-{t.number}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                    <span className="hidden text-xs text-muted sm:inline">{t.assignee?.name}</span>
                    <StatusBadge meta={TASK_STATUS[t.status]} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Stammdaten" />
            <CardContent className="divide-y divide-border py-1">
              <KeyValue label="Fortschritt"><span className="flex items-center gap-2"><Progress value={progress} className="w-24" tone={progress === 100 ? "success" : "orange"} /><span className="font-mono text-xs">{progress}%</span></span></KeyValue>
              <KeyValue label="Verantwortlich"><UserChip name={a.responsible?.name} /></KeyValue>
              <KeyValue label="Maschine">{a.machine.code} · {a.machine.name}</KeyValue>
              <KeyValue label="Seriennummer"><span className="font-mono text-xs">{a.machine.serialNumber ?? "—"}</span></KeyValue>
            </CardContent>
            {a.description && <p className="border-t border-border px-4 py-3 text-sm text-muted">{a.description}</p>}
          </Card>
          <Card>
            <CardHeader icon={<ShieldAlert />} title="Qualitätsmeldungen" />
            <ul className="divide-y divide-border">
              {a.qualityIssues.length === 0 && <li className="px-4 py-4 text-sm text-muted">Keine Meldungen.</li>}
              {a.qualityIssues.map((q) => (
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
            <CardHeader icon={<ClipboardList />} title="Montageanweisungen" />
            <ul className="divide-y divide-border">
              {a.workInstructions.length === 0 && <li className="px-4 py-4 text-sm text-muted">Keine Anweisungen.</li>}
              {a.workInstructions.map((w) => (
                <li key={w.id}>
                  <Link href={`/work-instructions/${w.id}`} className="flex items-center gap-2 px-4 py-2.5 hover:bg-elevated/40">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm">{w.title}</span><span className="text-2xs text-subtle">{w.number} · v{w.version}</span></span>
                    <StatusBadge meta={INSTRUCTION_STATUS[w.status]} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader icon={<FileText />} title="Technische Dokumente" action={<Link href={`/documents?upload=1&project=${project.id}&assembly=${a.id}`} className="text-xs text-primary">Hochladen</Link>} />
            <ul className="divide-y divide-border">
              {a.documents.length === 0 && <li className="px-4 py-4 text-sm text-muted">Keine Dokumente.</li>}
              {a.documents.map((d) => (
                <li key={d.id}>
                  <Link href={`/documents/${d.id}`} className="flex items-center gap-2 px-4 py-2.5 hover:bg-elevated/40">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm">{d.title}</span><span className="text-2xs text-subtle">{d.number} · {DOCUMENT_TYPE[d.type].label}</span></span>
                    <StatusBadge meta={DOCUMENT_STATUS[d.status]} />
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
