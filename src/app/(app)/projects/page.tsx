import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { requireContext } from "@/lib/auth/context";
import { listProjects } from "@/lib/services/projects";
import { userOptions } from "@/lib/services/users";
import { PageHeader, EmptyState, Progress, UserChip } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { FilterBar } from "@/components/ui/filter-bar";
import { PriorityIndicator } from "@/components/ui/priority";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectActions } from "@/components/projects/project-actions";
import { toProjectValues } from "@/components/projects/project-values";
import { PROJECT_STATUS, options } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Projects" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requireContext();
  const status = (sp.status as ProjectStatus | "ALL" | undefined) ?? undefined;
  const [projects, users] = await Promise.all([listProjects(ctx.workspaceId, { q: sp.q, status, ownerId: sp.owner }), userOptions()]);

  const newButton = (
    <Button>
      <Plus /> Neues Projekt
    </Button>
  );

  return (
    <>
      <PageHeader title="Projects" description="Kundenprojekte mit Maschinen, Baugruppen, Aufgaben und Qualitätsstatus." actions={<ProjectFormDialog users={users} trigger={newButton} defaultOpen={sp.new === "1"} />} />
      <FilterBar
        fields={[
          { type: "search", key: "q", placeholder: "Name, Kürzel oder Kunde" },
          { type: "select", key: "status", placeholder: "Alle außer archiviert", options: [...options(PROJECT_STATUS), { value: "ALL", label: "Alle inkl. archiviert" }] },
          { type: "select", key: "owner", placeholder: "Alle Verantwortlichen", options: users },
        ]}
      />
      {projects.length === 0 ? (
        <EmptyState icon={<FolderKanban />} title="Keine Projekte gefunden" description={sp.q || sp.status || sp.owner ? "Passe die Filter an oder lege ein neues Projekt an." : "Lege das erste Projekt an."} action={<ProjectFormDialog users={users} trigger={newButton} />} />
      ) : (
        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Projekt</TH>
                <TH>Status</TH>
                <TH>Priorität</TH>
                <TH className="min-w-40">Fortschritt</TH>
                <TH>Verantwortlich</TH>
                <TH>Zeitraum</TH>
                <TH className="text-right">Aufgaben</TH>
                <TH className="text-right">Offene QM</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {projects.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <Link href={`/projects/${p.id}`} className="group block min-w-52">
                      <span className="mr-2 font-mono text-2xs text-subtle">{p.key}</span>
                      <span className="font-medium group-hover:text-primary">{p.name}</span>
                      <span className="block text-xs text-subtle">{p.customer ?? "—"}</span>
                    </Link>
                  </TD>
                  <TD><StatusBadge meta={PROJECT_STATUS[p.status]} /></TD>
                  <TD><PriorityIndicator priority={p.priority} /></TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Progress value={p.progress} tone={p.progress === 100 ? "success" : "orange"} />
                      <span className="w-9 text-right font-mono text-xs">{p.progress}%</span>
                    </div>
                  </TD>
                  <TD><UserChip name={p.owner?.name} /></TD>
                  <TD className="whitespace-nowrap font-mono text-xs text-muted">
                    {formatDate(p.startDate)} – {formatDate(p.endDate)}
                  </TD>
                  <TD className="text-right font-mono text-xs">{p.tasksDone}/{p.tasksTotal}</TD>
                  <TD className={`text-right font-mono text-xs ${p._count.qualityIssues ? "text-warning" : "text-subtle"}`}>{p._count.qualityIssues}</TD>
                  <TD className="text-right">
                    <ProjectActions id={p.id} archived={p.status === "ARCHIVED"} values={toProjectValues(p)} users={users} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </>
  );
}
