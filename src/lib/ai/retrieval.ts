import "server-only";
import { db } from "@/lib/db";
import { chunkText } from "./processing";
import { scoreText, tokenize } from "./text";
import { getPublishedRevisions } from "@/lib/services/instructions";
import type { RetrievedChunk, Retriever } from "./types";

const sentence = (s: string | null | undefined) => (s ? (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`) : "—.");

/**
 * Keyword retriever over the live database (RAG preparation).
 * Replace with an embedding/pgvector retriever by implementing the same `Retriever` interface.
 */
export class KeywordRetriever implements Retriever {
  async retrieve(workspaceId: string, query: string, limit = 8): Promise<RetrievedChunk[]> {
    const terms = tokenize(query);
    if (!terms.length) return [];
    const [docs, assemblies, issues, instructions, tasks, projects, workOrders] = await Promise.all([
      db.document.findMany({ where: { workspaceId, status: { not: "ARCHIVED" } } }),
      db.assembly.findMany({ where: { machine: { project: { workspaceId } } }, include: { machine: true, responsible: { select: { name: true } } } }),
      db.qualityIssue.findMany({ where: { workspaceId }, include: { assembly: { select: { name: true } } } }),
      db.workInstruction.findMany({ where: { workspaceId }, include: { steps: true } }),
      db.task.findMany({ where: { workspaceId } }),
      db.project.findMany({ where: { workspaceId } }),
      db.workOrder.findMany({ where: { assembly: { machine: { project: { workspaceId } } } }, include: { assembly: true } }),
    ]);
    const published = await getPublishedRevisions(instructions.map((i) => i.id));
    const out: RetrievedChunk[] = [];
    const push = (c: Omit<RetrievedChunk, "score">) => {
      const score = scoreText(terms, `${c.code} ${c.title} ${c.text}`);
      if (score > 0) out.push({ ...c, score });
    };

    for (const d of docs) {
      const caveat = d.status === "APPROVED" ? undefined : `Dokumentstatus ${d.status} – nicht freigegeben`;
      const chunks = d.extractedText ? chunkText(d.extractedText) : [{ index: 0, text: d.description ?? "" }];
      for (const ch of chunks) push({ sourceId: d.id, type: "document", code: d.number, title: d.title, href: `/documents/${d.id}`, text: ch.text, caveat });
    }
    for (const a of assemblies) {
      push({ sourceId: a.id, type: "assembly", code: a.code, title: a.name, href: `/assembly/assemblies/${a.id}`, text: `${a.description ?? ""} Maschine ${a.machine.code} ${a.machine.name}. Status ${a.status}. Verantwortlich ${a.responsible?.name ?? "—"}.` });
    }
    for (const q of issues) {
      push({ sourceId: q.id, type: "quality", code: q.number, title: q.title, href: `/quality/${q.id}`, text: `${q.description} Ursache: ${q.rootCause ?? "nicht ermittelt"}. Status ${q.status}, Schweregrad ${q.severity}. Baugruppe ${q.assembly?.name ?? "—"}.` });
    }
    for (const w of instructions) {
      const rev = published.get(w.id);
      // Prefer the released content; drafts are retrievable but flagged.
      if (rev) {
        const s = rev.snapshot;
        push({ sourceId: w.id, type: "instruction", code: `${w.number} v${rev.version}`, title: s.title, href: `/work-instructions/${w.id}/released`, text: `${s.description ?? ""} Sicherheit: ${s.safetyNotes ?? "—"}. ${s.steps.map((st) => `Schritt ${st.order} ${st.title}: ${sentence(st.description)} Erwartet: ${sentence(st.expectedResult)}`).join(" ")}` });
      } else {
        push({ sourceId: w.id, type: "instruction", code: `${w.number} v${w.version}`, title: w.title, href: `/work-instructions/${w.id}`, caveat: `Status ${w.status} – keine freigegebene Produktionsanweisung`, text: `${w.description ?? ""} ${w.steps.map((st) => `Schritt ${st.order} ${st.title}: ${sentence(st.description)} Erwartet: ${sentence(st.expectedResult)}`).join(" ")}` });
      }
    }
    for (const t of tasks) push({ sourceId: t.id, type: "task", code: `TSK-${t.number}`, title: t.title, href: `/tasks/${t.id}`, text: `${t.description ?? ""} Status ${t.status}. Labels ${t.labels.join(", ")}.` });
    for (const p of projects) push({ sourceId: p.id, type: "project", code: p.key, title: p.name, href: `/projects/${p.id}`, text: `${p.description ?? ""} Kunde ${p.customer ?? "—"}. Status ${p.status}.` });
    for (const w of workOrders) push({ sourceId: w.id, type: "workOrder", code: w.number, title: w.title, href: `/assembly/work-orders/${w.id}`, text: `${w.description ?? ""} Baugruppe ${w.assembly.code} ${w.assembly.name}. Status ${w.status}.` });

    // best chunk per source, then top N
    const best = new Map<string, RetrievedChunk>();
    for (const c of out.sort((a, b) => b.score - a.score)) if (!best.has(c.sourceId)) best.set(c.sourceId, c);
    return [...best.values()].slice(0, limit);
  }
}
