import Link from "next/link";
import { Plus, ShieldCheck } from "lucide-react";
import type { QualityIssueType, QualityStatus, Severity } from "@prisma/client";
import { requireContext } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { listQualityIssues } from "@/lib/services/quality";
import { linkOptions } from "@/lib/services/tasks";
import { userOptions } from "@/lib/services/users";
import { PageHeader, EmptyState, UserChip } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { QualityFormDialog } from "@/components/quality/quality-form-dialog";
import { QUALITY_STATUS, QUALITY_STATUS_ORDER, QUALITY_TYPE, SEVERITY, options } from "@/lib/constants";
import { cn, formatDate, isOverdue } from "@/lib/utils";

export const metadata = { title: "Quality Management" };

export default async function QualityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requireContext();
  const [issues, counts, users, links] = await Promise.all([
    listQualityIssues(ctx.workspaceId, { q: sp.q, status: sp.status as QualityStatus | "OPEN" | undefined, severity: sp.severity as Severity | undefined, type: sp.type as QualityIssueType | undefined, projectId: sp.project, assigneeId: sp.assignee }),
    db.qualityIssue.groupBy({ by: ["status"], where: { workspaceId: ctx.workspaceId }, _count: true }),
    userOptions(),
    linkOptions(ctx.workspaceId),
  ]);
  const newButton = (
    <QualityFormDialog
      users={users}
      links={links}
      defaultOpen={sp.new === "1"}
      initial={{ projectId: sp.project ?? "", assemblyId: sp.assembly ?? "" }}
      trigger={<Button><Plus /> Neue Meldung</Button>}
    />
  );

  return (
    <>
      <PageHeader title="Quality Management" description="Fehler, Abweichungen und Prüfbefunde – mit Ursachenanalyse, Maßnahmen und Nachweis." actions={newButton} />
      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {QUALITY_STATUS_ORDER.map((s) => {
          const n = counts.find((c) => c.status === s)?._count ?? 0;
          return (
            <Link key={s} href={sp.status === s ? "/quality" : `/quality?status=${s}`} className={cn("rounded-md border bg-surface px-3 py-2 transition-colors", sp.status === s ? "border-primary/60" : "border-border hover:border-border-strong")}>
              <div className="text-2xs text-muted">{QUALITY_STATUS[s].label}</div>
              <div className="font-mono text-lg font-semibold">{n}</div>
            </Link>
          );
        })}
      </div>
      <FilterBar
        fields={[
          { type: "search", key: "q", placeholder: "Nummer, Titel, Beschreibung, Ursache" },
          { type: "select", key: "status", placeholder: "Alle Status", options: [{ value: "OPEN", label: "Alle offenen" }, ...options(QUALITY_STATUS)] },
          { type: "select", key: "severity", placeholder: "Alle Schweregrade", options: options(SEVERITY) },
          { type: "select", key: "type", placeholder: "Alle Arten", options: options(QUALITY_TYPE) },
          { type: "select", key: "project", placeholder: "Alle Projekte", options: links.projects },
          { type: "select", key: "assignee", placeholder: "Alle Verantwortlichen", options: users },
        ]}
      />
      {issues.length === 0 ? (
        <EmptyState icon={<ShieldCheck />} title="Keine Qualitätsmeldungen" description="Keine Meldungen für diese Auswahl." action={newButton} />
      ) : (
        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Meldung</TH>
                <TH>Art</TH>
                <TH>Schweregrad</TH>
                <TH>Status</TH>
                <TH>Bezug</TH>
                <TH>Maßnahmen</TH>
                <TH>Verantwortlich</TH>
                <TH>Frist</TH>
              </tr>
            </THead>
            <TBody>
              {issues.map((q) => {
                const done = q.actions.filter((a) => a.done).length;
                const open = !["RESOLVED", "CLOSED"].includes(q.status);
                return (
                  <TR key={q.id}>
                    <TD className="min-w-72">
                      <Link href={`/quality/${q.id}`} className="group block">
                        <span className="block font-mono text-2xs text-subtle">{q.number} · {formatDate(q.createdAt)}</span>
                        <span className="font-medium group-hover:text-primary">{q.title}</span>
                      </Link>
                    </TD>
                    <TD className="text-xs text-muted">{QUALITY_TYPE[q.type].label}</TD>
                    <TD><StatusBadge meta={SEVERITY[q.severity]} /></TD>
                    <TD><StatusBadge meta={QUALITY_STATUS[q.status]} /></TD>
                    <TD className="text-xs text-muted">
                      {q.project?.key ?? "—"}
                      {q.assembly && <> · <Link href={`/assembly/assemblies/${q.assembly.id}`} className="hover:text-fg">{q.assembly.code}</Link></>}
                      {q.workOrder && <span className="block"><Link href={`/assembly/work-orders/${q.workOrder.id}`} className="hover:text-fg">{q.workOrder.number}</Link></span>}
                    </TD>
                    <TD className="font-mono text-xs">{q._count.actions ? `${done}/${q._count.actions}` : "—"}</TD>
                    <TD><UserChip name={q.assignee?.name} /></TD>
                    <TD className={`whitespace-nowrap font-mono text-xs ${isOverdue(q.dueDate, !open) ? "text-danger" : "text-muted"}`}>{formatDate(q.dueDate)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}
    </>
  );
}
