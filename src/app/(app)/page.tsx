import Link from "next/link";
import { Activity, AlertTriangle, CheckCircle2, Cog, FolderKanban, ListChecks, ShieldAlert } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { getDashboard } from "@/lib/services/dashboard";
import { generateInsights } from "@/lib/ai/insights";
import { PageHeader, EmptyState, Avatar } from "@/components/ui/misc";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { BarList } from "@/components/charts/bar-list";
import { VerticalBarChart } from "@/components/charts/charts";
import { PriorityIndicator } from "@/components/ui/priority";
import { PROJECT_STATUS, QUALITY_STATUS, SEVERITY, TASK_STATUS, TASK_STATUS_ORDER, WORK_ORDER_STATUS } from "@/lib/constants";
import { formatDate, isOverdue, relativeTime } from "@/lib/utils";

export const metadata = { title: "Overview" };

export default async function DashboardPage() {
  const ctx = await requireContext();
  const [d, insights] = await Promise.all([getDashboard(ctx.workspaceId, ctx.user.id), generateInsights(ctx.workspaceId)]);
  const k = d.kpis;
  const hasData = d.projects.length > 0;

  return (
    <>
      <PageHeader
        title={`Guten Tag, ${ctx.user.name.split(" ")[0]}`}
        description={`${ctx.workspace.name} · Betriebsübersicht vom ${formatDate(new Date())}`}
        actions={
          <>
            <Link href="/reports" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Reports öffnen
            </Link>
            <Link href="/projects?new=1" className={buttonVariants({ size: "sm" })}>
              <FolderKanban className="size-3.5" /> Neues Projekt
            </Link>
          </>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={<FolderKanban />}
          title="Dieser Workspace enthält noch keine Projekte"
          description="Lege das erste Projekt an, um Aufgaben, Maschinen, Baugruppen und Montageaufträge zu planen."
          action={
            <Link href="/projects?new=1" className={buttonVariants()}>
              Projekt anlegen
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiCard label="Active Projects" value={k.activeProjects} icon={<FolderKanban />} href="/projects?status=ACTIVE" hint={`${d.projects.length} Projekte gesamt`} />
            <KpiCard label="Open Tasks" value={k.openTasks} icon={<ListChecks />} href="/tasks?view=table" hint="alle Status außer Done" />
            <KpiCard label="Assembly Progress" value={k.assemblyProgress} unit="%" icon={<Cog />} href="/assembly" hint={`Ø über ${k.totalWorkOrders} Montageaufträge`} />
            <KpiCard label="Open Quality Issues" value={k.openQualityIssues} icon={<ShieldAlert />} href="/quality" tone={k.criticalIssues ? "danger" : "default"} hint={k.criticalIssues ? `${k.criticalIssues} davon kritisch` : "keine kritischen"} />
            <KpiCard label="Overdue Tasks" value={k.overdueTasks} icon={<AlertTriangle />} href="/tasks?view=table&overdue=1" tone={k.overdueTasks ? "warning" : "success"} hint="Fälligkeit überschritten" />
            <KpiCard label="Completed Work Orders" value={k.completedWorkOrders} unit={`/ ${k.totalWorkOrders}`} icon={<CheckCircle2 />} href="/assembly?status=COMPLETED" tone="success" hint="abgeschlossene Montageaufträge" />
          </section>

          <section className="grid gap-6 xl:grid-cols-5">
            <Card className="xl:col-span-3">
              <CardHeader title="Projektfortschritt" description="Ø aus Aufgabenerledigung und Montagefortschritt" action={<Link href="/projects" className="text-xs text-primary hover:text-primary-hover">Alle Projekte</Link>} />
              <CardContent>
                <BarList
                  items={d.projects.map((p) => ({
                    id: p.id,
                    label: p.name,
                    sublabel: p.key,
                    value: p.progress,
                    href: `/projects/${p.id}`,
                    right: <StatusBadge meta={PROJECT_STATUS[p.status]} />,
                  }))}
                />
              </CardContent>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader title="Aufgabenübersicht" description="Aufgaben nach Status" action={<Link href="/tasks" className="text-xs text-primary hover:text-primary-hover">Kanban</Link>} />
              <CardContent>
                <VerticalBarChart
                  name="Aufgaben"
                  height={190}
                  data={TASK_STATUS_ORDER.map((s) => ({ label: TASK_STATUS[s].label, value: d.taskStatus.find((t) => t.status === s)?._count ?? 0 }))}
                />
                <div className="mt-4 border-t border-border pt-3">
                  <div className="label-caps mb-2">Meine nächsten Aufgaben</div>
                  {d.myTasks.length === 0 ? (
                    <p className="text-xs text-muted">Keine offenen Aufgaben zugewiesen.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {d.myTasks.map((t) => (
                        <li key={t.id} className="flex items-center gap-2 text-sm">
                          <PriorityIndicator priority={t.priority} showLabel={false} />
                          <Link href={`/tasks/${t.id}`} className="min-w-0 flex-1 truncate hover:text-primary">
                            {t.title}
                          </Link>
                          <span className={`shrink-0 font-mono text-2xs ${isOverdue(t.dueDate) ? "text-danger" : "text-subtle"}`}>{formatDate(t.dueDate)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Montagefortschritt" description="Je Baugruppe, berechnet aus ausgeführten Arbeitsschritten" action={<Link href="/assembly" className="text-xs text-primary hover:text-primary-hover">Assembly</Link>} />
              <CardContent>
                <BarList
                  items={d.assemblies.map((a) => ({ id: a.id, label: a.name, sublabel: a.code, value: a.progress, href: `/assembly/assemblies/${a.id}` }))}
                  empty="Noch keine Montageaufträge"
                />
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                  {d.activeWorkOrders.map((w) => (
                    <Link key={w.id} href={`/assembly/work-orders/${w.id}`} className="inline-flex items-center gap-2 rounded border border-border px-2 py-1 text-xs hover:border-border-strong">
                      <span className="font-mono text-subtle">{w.number}</span>
                      <StatusBadge meta={WORK_ORDER_STATUS[w.status]} />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Qualitätsmeldungen" description="Offene Meldungen nach Schweregrad" action={<Link href="/quality" className="text-xs text-primary hover:text-primary-hover">Quality</Link>} />
              {d.openIssues.length === 0 ? (
                <CardContent>
                  <p className="py-6 text-center text-sm text-muted">Keine offenen Qualitätsmeldungen.</p>
                </CardContent>
              ) : (
                <ul className="divide-y divide-border">
                  {d.openIssues.map((q) => (
                    <li key={q.id}>
                      <Link href={`/quality/${q.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-elevated/40">
                        <span className="w-16 shrink-0 font-mono text-2xs text-subtle">{q.number}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{q.title}</span>
                          <span className="block truncate text-xs text-subtle">{q.assembly?.name ?? "—"} · {relativeTime(q.createdAt)}</span>
                        </span>
                        <span className="hidden shrink-0 gap-1.5 sm:flex">
                          <StatusBadge meta={SEVERITY[q.severity]} />
                          <StatusBadge meta={QUALITY_STATUS[q.status]} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <InsightsPanel insights={insights} />
            <Card>
              <CardHeader icon={<Activity />} title="Letzte Aktivitäten" />
              <ul className="divide-y divide-border">
                {d.activities.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted">Noch keine Aktivitäten.</li>}
                {d.activities.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                    <Avatar name={a.actor?.name} size="sm" className="mt-0.5" />
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="font-medium">{a.actor?.name ?? "System"}</span>{" "}
                      {a.link ? (
                        <Link href={a.link} className="text-muted hover:text-fg">
                          {a.summary}
                        </Link>
                      ) : (
                        <span className="text-muted">{a.summary}</span>
                      )}
                      <div className="text-2xs text-subtle">{relativeTime(a.createdAt)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </div>
      )}
    </>
  );
}
