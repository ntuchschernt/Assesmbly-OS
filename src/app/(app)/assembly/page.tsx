import { Cog, Cpu, Boxes, ClipboardPlus } from "lucide-react";
import type { WorkOrderStatus } from "@prisma/client";
import { requireContext } from "@/lib/auth/context";
import { getAssemblyTree } from "@/lib/services/assembly";
import { assemblyFormOptions } from "@/lib/services/assembly-options";
import { listWorkOrders } from "@/lib/services/work-orders";
import { average } from "@/lib/services/progress";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { AssemblyTree } from "@/components/assembly/assembly-tree";
import { WorkOrderTable } from "@/components/assembly/work-order-table";
import { AssemblyFormDialog, MachineFormDialog, WorkOrderFormDialog } from "@/components/assembly/assembly-forms";
import { WORK_ORDER_STATUS, options } from "@/lib/constants";

export const metadata = { title: "Assembly" };

export default async function AssemblyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requireContext();
  const [tree, opts, orders] = await Promise.all([
    getAssemblyTree(ctx.workspaceId, sp.project),
    assemblyFormOptions(ctx.workspaceId),
    listWorkOrders(ctx.workspaceId, {
      ...(sp.status ? { status: sp.status as WorkOrderStatus } : {}),
      ...(sp.project ? { assembly: { machine: { projectId: sp.project } } } : {}),
      ...(sp.machine ? { assembly: { machineId: sp.machine } } : {}),
      ...(sp.q ? { OR: [{ title: { contains: sp.q, mode: "insensitive" } }, { number: { contains: sp.q, mode: "insensitive" } }] } : {}),
    }),
  ]);
  const machine = sp.machine ? tree.flatMap((p) => p.machines).find((m) => m.id === sp.machine) : undefined;
  const machineCount = tree.reduce((a, p) => a + p.machines.length, 0);

  return (
    <>
      <PageHeader
        title="Assembly"
        description="Maschinen, Baugruppen und Montageaufträge – von der Struktur bis zur Ausführung."
        actions={
          <>
            <MachineFormDialog projects={opts.projects} initial={{ projectId: sp.project ?? "" }} defaultOpen={sp.newMachine === "1"} trigger={<Button variant="secondary" size="sm"><Cpu /> Maschine</Button>} />
            <AssemblyFormDialog machines={opts.machines} parents={opts.parents} users={opts.users} initial={{ machineId: sp.machine ?? "" }} trigger={<Button variant="secondary" size="sm"><Boxes /> Baugruppe</Button>} />
            <WorkOrderFormDialog assemblies={opts.assemblies} instructions={opts.instructions} users={opts.users} trigger={<Button size="sm"><ClipboardPlus /> Montageauftrag</Button>} />
          </>
        }
      />
      {machineCount === 0 && !sp.project ? (
        <EmptyState icon={<Cog />} title="Noch keine Maschinen angelegt" description="Lege zuerst ein Projekt und darin eine Maschine an. Danach folgen Baugruppen und Montageaufträge." action={<MachineFormDialog projects={opts.projects} trigger={<Button><Cpu /> Maschine anlegen</Button>} />} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
          <Card className="self-start">
            <CardHeader title="Baugruppenhierarchie" description="Projekt → Maschine → Baugruppe → Unterbaugruppe" />
            <AssemblyTree tree={tree} activeMachineId={sp.machine} />
          </Card>
          <div className="min-w-0">
            <FilterBar
              fields={[
                { type: "search", key: "q", placeholder: "Auftragsnummer oder Titel" },
                { type: "select", key: "status", placeholder: "Alle Status", options: options(WORK_ORDER_STATUS) },
                { type: "select", key: "project", placeholder: "Alle Projekte", options: opts.projects },
                { type: "select", key: "machine", placeholder: "Alle Maschinen", options: opts.machines },
              ]}
            />
            <Card>
              <CardHeader
                title={machine ? `Montageaufträge · ${machine.code} ${machine.name}` : "Montageaufträge"}
                description={`${orders.length} Aufträge · Ø Fortschritt ${average(orders.map((o) => o.progress))}%`}
              />
              {orders.length ? <WorkOrderTable orders={orders} /> : <p className="p-8 text-center text-sm text-muted">Keine Montageaufträge für diese Auswahl.</p>}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
