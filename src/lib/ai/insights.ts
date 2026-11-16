import "server-only";
import { db } from "@/lib/db";
import { QUALITY_OPEN_STATUSES } from "@/lib/constants";
import { listWorkOrders } from "@/lib/services/work-orders";

export type Insight = {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  detail: string;
  sources: { label: string; href: string }[];
};

/**
 * Dashboard hints. Produced by the demo provider as transparent RULES over real records –
 * not by a language model. The UI labels them accordingly ("simuliert / regelbasiert").
 */
export async function generateInsights(workspaceId: string, now = new Date()): Promise<Insight[]> {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const [overdue, critical, inReview, workOrders] = await Promise.all([
    db.task.findMany({ where: { workspaceId, status: { not: "DONE" }, dueDate: { lt: startOfToday } }, orderBy: { dueDate: "asc" }, take: 5 }),
    db.qualityIssue.findMany({ where: { workspaceId, severity: "CRITICAL", status: { in: QUALITY_OPEN_STATUSES } } }),
    db.workInstruction.findMany({ where: { workspaceId, status: "IN_REVIEW" } }),
    listWorkOrders(workspaceId, { status: { not: "COMPLETED" } }),
  ]);
  const insights: Insight[] = [];

  for (const q of critical) {
    insights.push({
      id: `crit-${q.id}`,
      level: "critical",
      title: `Kritische Qualitätsmeldung ${q.number} offen`,
      detail: `„${q.title}“ hat Schweregrad Critical und Status ${q.status}. Betroffene Montage sollte bis zur Klärung nicht freigegeben werden.`,
      sources: [{ label: q.number, href: `/quality/${q.id}` }],
    });
  }
  const paused = workOrders.filter((w) => w.status === "PAUSED");
  for (const w of paused) {
    insights.push({
      id: `paused-${w.id}`,
      level: "warning",
      title: `Montageauftrag ${w.number} pausiert`,
      detail: `${w.title} (${w.assembly.name}) ist pausiert${w._count.qualityIssues ? ` – ${w._count.qualityIssues} verknüpfte Qualitätsmeldung(en)` : ""}.`,
      sources: [{ label: w.number, href: `/assembly/work-orders/${w.id}` }],
    });
  }
  const unreleased = workOrders.filter((w) => w.workInstruction && w.publishedVersion === null);
  for (const w of unreleased) {
    insights.push({
      id: `unrel-${w.id}`,
      level: "warning",
      title: `${w.number}: Montageanweisung nicht freigegeben`,
      detail: `${w.workInstruction!.number} hat Status ${w.workInstruction!.status}. Die Ausführung ist gesperrt, bis eine veröffentlichte Version vorliegt.`,
      sources: [
        { label: w.number, href: `/assembly/work-orders/${w.id}` },
        { label: w.workInstruction!.number, href: `/work-instructions/${w.workInstruction!.id}` },
      ],
    });
  }
  if (overdue.length) {
    insights.push({
      id: "overdue",
      level: "warning",
      title: `${overdue.length} überfällige Aufgabe(n)`,
      detail: overdue.map((t) => `TSK-${t.number} ${t.title}`).join(" · "),
      sources: overdue.slice(0, 3).map((t) => ({ label: `TSK-${t.number}`, href: `/tasks/${t.id}` })),
    });
  }
  for (const wi of inReview) {
    insights.push({
      id: `review-${wi.id}`,
      level: "info",
      title: `${wi.number} wartet auf Prüfung`,
      detail: `„${wi.title}“ ist zur Freigabe eingereicht. Freigabe erfolgt ausschließlich durch berechtigte Personen.`,
      sources: [{ label: wi.number, href: `/work-instructions/${wi.id}` }],
    });
  }
  return insights.slice(0, 6);
}
