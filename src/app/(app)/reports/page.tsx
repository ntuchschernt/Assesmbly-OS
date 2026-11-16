import { requireContext } from "@/lib/auth/context";
import { getReport, PERIODS, type Period } from "@/lib/services/reports";
import { projectOptions } from "@/lib/services/projects";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { BarList } from "@/components/charts/bar-list";
import { SERIES, TrendChart, VerticalBarChart } from "@/components/charts/charts";
import { QUALITY_TYPE, SEVERITY, TASK_STATUS, WORK_ORDER_STATUS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { Severity, TaskStatus, QualityIssueType, WorkOrderStatus } from "@prisma/client";

export const metadata = { title: "Reports" };

const fmt = (v: number | null, unit = "") => (v === null ? "—" : `${String(v).replace(".", ",")}${unit}`);

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requireContext();
  const period = (sp.period && sp.period in PERIODS ? sp.period : "90") as Period;
  const [r, projects] = await Promise.all([getReport(ctx.workspaceId, { projectId: sp.project, period }), projectOptions(ctx.workspaceId)]);
  const severityColor: Record<string, string> = { CRITICAL: "#E05B55", MAJOR: "#E8AA45", MINOR: "#6E9FC9" };

  return (
    <>
      <PageHeader title="Reports" description={`Kennzahlen aus dem aktuellen Datenbestand${r.from ? ` · seit ${formatDate(r.from)}` : ""}. Alle Werte werden live berechnet.`} />
      <FilterBar
        fields={[
          { type: "select", key: "project", placeholder: "Alle Projekte", options: projects },
          { type: "select", key: "period", placeholder: "Letzte 90 Tage", options: Object.entries(PERIODS).filter(([k]) => k !== "90").map(([value, label]) => ({ value, label })) },
        ]}
      />

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Ø Montagefortschritt" value={`${r.assembly.average}%`} hint={`${r.assembly.orders.length} Montageaufträge`} />
        <Kpi label="Fehlerquote Aufträge" value={fmt(r.errorRate.workOrdersWithIssues, " %")} hint={`${r.errorRate.woAffected} von ${r.errorRate.woTotal} Aufträgen mit QM-Meldung`} warn={(r.errorRate.workOrdersWithIssues ?? 0) > 20} />
        <Kpi label="Prüfschritte nicht i.O." value={fmt(r.errorRate.stepFailRate, " %")} hint={`${r.errorRate.stepsTotal} erfasste Schritte im Zeitraum`} />
        <Kpi label="Offene Qualitätsmeldungen" value={String(r.quality.open)} hint={`${r.quality.total} im Zeitraum gemeldet`} warn={r.quality.open > 0} />
      </section>

      <section className="mb-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Projektfortschritt" />
          <CardContent><BarList items={r.projects.map((p) => ({ id: p.id, label: p.name, sublabel: p.key, value: p.progress, href: `/projects/${p.id}` }))} empty="Keine Projekte" /></CardContent>
        </Card>
        <Card>
          <CardHeader title="Aufgaben: erstellt vs. erledigt" description="Pro Woche im gewählten Zeitraum" />
          <CardContent>
            <TrendChart data={r.trend} series={[{ key: "created", name: "Erstellt", color: SERIES.b }, { key: "completed", name: "Erledigt", color: SERIES.a }]} />
          </CardContent>
        </Card>
      </section>

      <section className="mb-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <CardHeader title="Aufgabenstatus" description="Aufgaben mit Aktivität im Zeitraum" />
          <CardContent><VerticalBarChart name="Aufgaben" data={r.taskStatus.map((t) => ({ label: TASK_STATUS[t.status as TaskStatus].label, value: t.count }))} /></CardContent>
        </Card>
        <Card>
          <CardHeader title="Qualitätsmeldungen nach Schweregrad" description="Offen (Balken) · gesamt in Klammern" />
          <CardContent>
            <VerticalBarChart name="Offen" data={r.quality.bySeverity.map((s) => ({ label: `${SEVERITY[s.severity as Severity].label} (${s.total})`, value: s.open, color: severityColor[s.severity] }))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Qualitätsmeldungen nach Art" />
          <CardContent><VerticalBarChart name="Meldungen" data={r.quality.byType.map((t) => ({ label: QUALITY_TYPE[t.type as QualityIssueType].label, value: t.count }))} /></CardContent>
        </Card>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Ø Durchlaufzeit Montageauftrag" value={fmt(r.cycleTimes.workOrderDays, " Tage")} hint={`Start → Abschluss · ${r.cycleTimes.workOrderCount} abgeschlossen`} />
        <Kpi label="Ø Durchlaufzeit Aufgabe" value={fmt(r.cycleTimes.taskDays, " Tage")} hint={`Erstellung → Done · ${r.cycleTimes.taskCount} erledigt`} />
        <Kpi label="Ø Bearbeitungszeit QM" value={fmt(r.cycleTimes.qualityDays, " Tage")} hint={`Meldung → gelöst · ${r.cycleTimes.qualityCount} gelöst`} />
      </section>

      <Card>
        <CardHeader title="Montagefortschritt & Zeiten je Auftrag" description="Plan- vs. Ist-Stunden aus der Zeiterfassung" />
        <Table>
          <THead><tr><TH>Auftrag</TH><TH>Status</TH><TH className="text-right">Fortschritt</TH><TH className="text-right">Plan h</TH><TH className="text-right">Ist h</TH><TH className="text-right">Abweichung</TH></tr></THead>
          <TBody>
            {r.assembly.orders.map((o) => {
              const diff = Math.round((o.actualHours - o.plannedHours) * 10) / 10;
              return (
                <TR key={o.id}>
                  <TD><a href={`/assembly/work-orders/${o.id}`} className="hover:text-primary"><span className="mr-2 font-mono text-2xs text-subtle">{o.number}</span>{o.title}</a></TD>
                  <TD><StatusBadge meta={WORK_ORDER_STATUS[o.status as WorkOrderStatus]} /></TD>
                  <TD className="text-right font-mono text-xs">{o.progress}%</TD>
                  <TD className="text-right font-mono text-xs">{fmt(o.plannedHours)}</TD>
                  <TD className="text-right font-mono text-xs">{fmt(o.actualHours)}</TD>
                  <TD className={`text-right font-mono text-xs ${diff > 0 ? "text-warning" : "text-muted"}`}>{diff > 0 ? "+" : ""}{fmt(diff)}</TD>
                </TR>
              );
            })}
            {r.assembly.orders.length === 0 && <tr><TD colSpan={6} className="py-8 text-center text-muted">Keine Montageaufträge</TD></tr>}
          </TBody>
        </Table>
      </Card>
    </>
  );
}

function Kpi({ label, value, hint, warn }: { label: string; value: string; hint: string; warn?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="label-caps">{label}</div>
      <div className={`mt-2 font-mono text-2xl font-semibold ${warn ? "text-warning" : ""}`}>{value}</div>
      <div className="mt-1 text-xs text-subtle">{hint}</div>
    </div>
  );
}
