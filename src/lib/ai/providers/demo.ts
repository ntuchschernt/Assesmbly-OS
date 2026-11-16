import "server-only";
import { db } from "@/lib/db";
import { QUALITY_OPEN_STATUSES, QUALITY_STATUS, SEVERITY, WORK_ORDER_STATUS } from "@/lib/constants";
import { listProjects } from "@/lib/services/projects";
import { listWorkOrders } from "@/lib/services/work-orders";
import { formatDate } from "@/lib/utils";
import { extractCodes, relevantSentences, tokenize } from "../text";
import type { AiAnswer, AiSource, LlmProvider, RetrievedChunk, Retriever, SuggestedAction } from "../types";

/**
 * DEMO PROVIDER – no language model involved.
 * Detects the intent with simple rules and composes answers ONLY from records in the database.
 * Every answer is flagged `simulated: true`. If nothing relevant is found it says so instead of guessing.
 */
export class DemoProvider implements LlmProvider {
  readonly name = "demo";
  readonly simulated = true;

  async answer({ workspaceId, question, retriever }: { workspaceId: string; question: string; retriever: Retriever }): Promise<AiAnswer> {
    const q = question.toLowerCase();
    const codes = extractCodes(question);
    try {
      if (/anweisung/.test(q) && /(vorbereit|bereite|entw|erstell|anleg|generier)/.test(q)) return await this.prepareInstruction(workspaceId, question, retriever);
      if (/aufgabe.*vorschl|vorschl.*aufgabe|aufgaben (aus|zu|für|fur)|was (ist|sollten wir|müssen wir) .*tun/.test(q)) return await this.suggestTasks(workspaceId);
      if (codes.quality.length || /qualit|qm-|mängel|maengel|abweichung/.test(q)) return await this.summarizeQuality(workspaceId, codes.quality);
      if (codes.documents.length && /zusammen|überblick|ueberblick|inhalt|worum/.test(q)) return await this.summarizeDocument(workspaceId, codes.documents[0]!);
      if (/projekt|fortschritt|status|risik|stand\b|analys/.test(q) && !/anzugsmoment|nm\b/.test(q)) return await this.analyzeProject(workspaceId, question);
      return await this.lookup(workspaceId, question, retriever);
    } catch (e) {
      console.error("[ai.demo]", e);
      return this.result("Bei der Auswertung des Datenbestands ist ein Fehler aufgetreten. Bitte erneut versuchen.", [], "none", ["Interner Fehler im Demo-Provider"]);
    }
  }

  private result(text: string, sources: AiSource[], confidence: AiAnswer["confidence"], warnings: string[] = [], actions: SuggestedAction[] = []): AiAnswer {
    return { text, sources, confidence, simulated: true, provider: this.name, warnings, actions };
  }

  private toSource(c: RetrievedChunk, excerpt?: string): AiSource {
    return { id: c.sourceId, type: c.type, code: c.code, title: c.title, href: c.href, excerpt, caveat: c.caveat };
  }

  // ---------------------------------------------------------------- technical Q&A (retrieval only)
  private async lookup(workspaceId: string, question: string, retriever: Retriever): Promise<AiAnswer> {
    const terms = tokenize(question);
    const chunks = await retriever.retrieve(workspaceId, question, 6);
    const strong = chunks.filter((c) => c.score >= 1.5);
    if (!strong.length) {
      return this.result(
        "Dazu habe ich im Datenbestand **keine belastbaren Angaben** gefunden. Ich erfinde keine technischen Werte – bitte die zuständige Konstruktion oder das Datenblatt des Herstellers konsultieren." +
          (chunks.length ? "\n\nMöglicherweise thematisch verwandt:" + chunks.slice(0, 3).map((c) => `\n- ${c.code} · ${c.title}`).join("") : ""),
        chunks.slice(0, 3).map((c) => this.toSource(c)),
        "none",
        ["Keine passende Quelle gefunden"],
      );
    }
    const lines: string[] = [];
    const sources: AiSource[] = [];
    for (const c of strong.slice(0, 3)) {
      const sentences = relevantSentences(terms, c.text, 2);
      const excerpt = sentences.join(" ") || c.text.slice(0, 220);
      sources.push(this.toSource(c, excerpt));
      lines.push(`- **${c.code}** (${c.title}): ${excerpt}${c.caveat ? ` _(${c.caveat})_` : ""}`);
    }
    const caveated = strong.slice(0, 3).some((c) => c.caveat);
    const confidence = strong.length >= 2 && !caveated ? "high" : caveated ? "low" : "medium";
    return this.result(
      `Folgende Angaben finden sich im Datenbestand:\n${lines.join("\n")}\n\nDie Werte sind wörtlich aus den Quellen übernommen. Maßgeblich ist immer das freigegebene Originaldokument.`,
      sources,
      confidence,
      caveated ? ["Mindestens eine Quelle ist nicht freigegeben – Angaben vor Verwendung prüfen."] : [],
    );
  }

  // ---------------------------------------------------------------- quality summary
  private async summarizeQuality(workspaceId: string, numbers: string[]): Promise<AiAnswer> {
    const issues = await db.qualityIssue.findMany({
      where: { workspaceId, ...(numbers.length ? { number: { in: numbers } } : { status: { in: QUALITY_OPEN_STATUSES } }) },
      include: { actions: true, assembly: { select: { name: true } }, assignee: { select: { name: true } } },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
    });
    if (!issues.length) return this.result(numbers.length ? `Die Meldung(en) ${numbers.join(", ")} existieren in diesem Workspace nicht.` : "Es gibt aktuell keine offenen Qualitätsmeldungen.", [], numbers.length ? "none" : "high");
    const lines = issues.map((i) => {
      const open = i.actions.filter((a) => !a.done).length;
      return `- **${i.number} – ${i.title}** (${SEVERITY[i.severity].label}, ${QUALITY_STATUS[i.status].label}) · Baugruppe ${i.assembly?.name ?? "—"} · verantwortlich ${i.assignee?.name ?? "offen"}\n  Ursache: ${i.rootCause ?? "noch nicht ermittelt"} · Maßnahmen: ${i.actions.length - open}/${i.actions.length} erledigt${i.dueDate ? ` · Frist ${formatDate(i.dueDate)}` : ""}`;
    });
    const critical = issues.filter((i) => i.severity === "CRITICAL" && QUALITY_OPEN_STATUSES.includes(i.status));
    const noCause = issues.filter((i) => !i.rootCause && QUALITY_OPEN_STATUSES.includes(i.status));
    const summary = numbers.length ? `Zusammenfassung von ${issues.length} Meldung(en):` : `${issues.length} offene Qualitätsmeldung(en), davon ${critical.length} kritisch:`;
    const notes = [critical.length ? `Kritisch und offen: ${critical.map((c) => c.number).join(", ")}.` : "", noCause.length ? `Ohne dokumentierte Ursache: ${noCause.map((c) => c.number).join(", ")}.` : ""].filter(Boolean);
    return this.result(
      `${summary}\n${lines.join("\n")}${notes.length ? `\n\n**Hinweise:** ${notes.join(" ")}` : ""}`,
      issues.map((i) => ({ id: i.id, type: "quality" as const, code: i.number, title: i.title, href: `/quality/${i.id}` })),
      "high",
    );
  }

  // ---------------------------------------------------------------- document summary
  private async summarizeDocument(workspaceId: string, number: string): Promise<AiAnswer> {
    const d = await db.document.findFirst({ where: { workspaceId, number }, include: { assembly: { select: { name: true } }, project: { select: { key: true } } } });
    if (!d) return this.result(`Dokument ${number} wurde in diesem Workspace nicht gefunden.`, [], "none");
    const source: AiSource = { id: d.id, type: "document", code: d.number, title: d.title, href: `/documents/${d.id}`, caveat: d.status === "APPROVED" ? undefined : `Status ${d.status}` };
    if (!d.extractedText) {
      return this.result(`Für **${d.number} ${d.title}** liegt kein extrahierter Text vor. Ohne Inhalt kann ich das Dokument nicht zusammenfassen – Metadaten: Typ ${d.type}, Status ${d.status}, Version ${d.currentVersion}.`, [source], "none", ["Kein verarbeiteter Dokumentinhalt"]);
    }
    const sentences = d.extractedText.split(/(?<=[.!?])\s+/).filter(Boolean);
    const keyFacts = sentences.slice(1).filter((s) => /\d/.test(s)).slice(0, 6);
    return this.result(
      `**${d.number} – ${d.title}** (${d.type}, Version ${d.currentVersion}, Status ${d.status}${d.project ? `, Projekt ${d.project.key}` : ""}${d.assembly ? `, Baugruppe ${d.assembly.name}` : ""})\n\n${sentences[0]}\n\n**Kennwerte laut Dokument:**\n${keyFacts.map((s) => `- ${s}`).join("\n") || "- keine numerischen Angaben"}`,
      [source],
      d.status === "APPROVED" ? "high" : "medium",
      d.status === "APPROVED" ? [] : ["Dokument ist nicht freigegeben – Inhalte können sich noch ändern."],
    );
  }

  // ---------------------------------------------------------------- task suggestions from problems
  private async suggestTasks(workspaceId: string): Promise<AiAnswer> {
    const issues = await db.qualityIssue.findMany({
      where: { workspaceId, status: { in: QUALITY_OPEN_STATUSES } },
      include: { actions: true },
      orderBy: [{ severity: "desc" }],
    });
    const actions: SuggestedAction[] = [];
    const lines: string[] = [];
    for (const i of issues) {
      const openActions = i.actions.filter((a) => !a.done);
      const proposal = !i.rootCause ? `Ursachenanalyse für ${i.number} durchführen` : openActions[0] ? `${openActions[0].title} (${i.number})` : !i.actions.some((a) => a.type === "VERIFICATION") ? `Wirksamkeitsprüfung für ${i.number} planen` : null;
      if (!proposal) continue;
      const priority = i.severity === "CRITICAL" ? "CRITICAL" : i.severity === "MAJOR" ? "HIGH" : "MEDIUM";
      lines.push(`- **${proposal}** – Grund: ${!i.rootCause ? "keine Ursache dokumentiert" : openActions[0] ? "Maßnahme offen" : "keine Verifikation definiert"} (${SEVERITY[i.severity].label})`);
      actions.push({
        kind: "createTask",
        label: proposal,
        task: { title: proposal, description: `Vorgeschlagen von ASSEMBLY AI (Demo) auf Basis von ${i.number} „${i.title}“.`, priority, projectId: i.projectId ?? undefined, assemblyId: i.assemblyId ?? undefined, workOrderId: i.workOrderId ?? undefined, labels: `Qualität, ${i.number}` },
      });
    }
    if (!actions.length) return this.result("Aus den offenen Qualitätsmeldungen ergeben sich derzeit keine zusätzlichen Aufgaben.", [], "high");
    return this.result(
      `Aus ${issues.length} offenen Qualitätsmeldungen schlage ich folgende Aufgaben vor:\n${lines.join("\n")}\n\nAufgaben werden **nur nach deiner Bestätigung** angelegt.`,
      issues.map((i) => ({ id: i.id, type: "quality" as const, code: i.number, title: i.title, href: `/quality/${i.id}` })),
      "medium",
      [],
      actions.slice(0, 5),
    );
  }

  // ---------------------------------------------------------------- project analysis
  private async analyzeProject(workspaceId: string, question: string): Promise<AiAnswer> {
    const projects = await listProjects(workspaceId);
    if (!projects.length) return this.result("In diesem Workspace gibt es keine Projekte.", [], "none");
    const terms = tokenize(question);
    const project =
      projects.find((p) => terms.some((t) => p.key.toLowerCase() === t || p.name.toLowerCase().includes(t) && t.length > 3)) ??
      projects.find((p) => p.status === "ACTIVE") ??
      projects[0]!;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const [wos, overdue, issues] = await Promise.all([
      listWorkOrders(workspaceId, { assembly: { machine: { projectId: project.id } } }),
      db.task.findMany({ where: { workspaceId, projectId: project.id, status: { not: "DONE" }, dueDate: { lt: startOfToday } } }),
      db.qualityIssue.findMany({ where: { workspaceId, projectId: project.id, status: { in: QUALITY_OPEN_STATUSES } } }),
    ]);
    const risks: string[] = [];
    const critical = issues.filter((i) => i.severity === "CRITICAL");
    if (critical.length) risks.push(`${critical.length} kritische Qualitätsmeldung(en) offen (${critical.map((c) => c.number).join(", ")})`);
    const paused = wos.filter((w) => w.status === "PAUSED");
    if (paused.length) risks.push(`pausierte Montageaufträge: ${paused.map((w) => w.number).join(", ")}`);
    const blocked = wos.filter((w) => w.workInstruction && w.publishedVersion === null);
    if (blocked.length) risks.push(`Ausführung ohne freigegebene Anweisung gesperrt: ${blocked.map((w) => w.number).join(", ")}`);
    if (overdue.length) risks.push(`${overdue.length} überfällige Aufgabe(n)`);
    const over = wos.filter((w) => w.loggedMinutes / 60 > w.plannedHours);
    if (over.length) risks.push(`Planzeit überschritten: ${over.map((w) => w.number).join(", ")}`);

    return this.result(
      `**${project.key} – ${project.name}** (${project.status}, Ende geplant ${formatDate(project.endDate)})\n\n- Gesamtfortschritt: **${project.progress} %** (Aufgaben ${project.tasksDone}/${project.tasksTotal} erledigt)\n- Montageaufträge: ${wos.map((w) => `${w.number} ${WORK_ORDER_STATUS[w.status].label} ${w.progress} %`).join(" · ") || "keine"}\n- Offene Qualitätsmeldungen: ${issues.length}\n\n**Risiken:**\n${risks.length ? risks.map((r) => `- ${r}`).join("\n") : "- keine auffälligen Risiken im Datenbestand"}`,
      [
        { id: project.id, type: "project", code: project.key, title: project.name, href: `/projects/${project.id}` },
        ...wos.slice(0, 5).map((w) => ({ id: w.id, type: "workOrder" as const, code: w.number, title: w.title, href: `/assembly/work-orders/${w.id}` })),
      ],
      "high",
      ["Analyse basiert auf Statusdaten im System – nicht erfasste Informationen sind nicht berücksichtigt."],
    );
  }

  // ---------------------------------------------------------------- work instruction draft preparation
  private async prepareInstruction(workspaceId: string, question: string, retriever: Retriever): Promise<AiAnswer> {
    const terms = tokenize(question);
    const assemblies = await db.assembly.findMany({ where: { machine: { project: { workspaceId } } }, include: { documents: true } });
    const assembly = assemblies.find((a) => terms.some((t) => t.length > 3 && (a.name.toLowerCase().includes(t) || a.code.toLowerCase() === t)));
    if (!assembly) {
      return this.result("Für welche Baugruppe soll ich einen Entwurf vorbereiten? Bitte Namen oder Sachnummer angeben, z. B. „Montageanweisung für Ventileinheit vorbereiten“.", [], "none");
    }
    const docs = assembly.documents.filter((d) => d.extractedText);
    const chunks = (await retriever.retrieve(workspaceId, `${assembly.name} ${assembly.code}`, 6)).filter((c) => c.type === "document");
    const facts = docs.flatMap((d) => d.extractedText!.split(/(?<=[.!?])\s+/).filter((s) => /\d/.test(s)).slice(0, 4).map((s) => ({ doc: d, s })));
    const steps = [
      { title: "Unterlagen und Material bereitstellen", description: `Gültige Dokumente prüfen: ${docs.map((d) => d.number).join(", ") || "– keine verknüpft –"}. Material gemäß Stückliste kommissionieren.`, expectedResult: "Alle Unterlagen in freigegebener Version vorhanden." },
      ...facts.slice(0, 4).map((f, i) => ({ title: `Montageschritt ${i + 1} (aus ${f.doc.number} ableiten)`, description: `[Vom Ersteller auszuformulieren] Grundlage laut ${f.doc.number}: „${f.s}“`, expectedResult: `Gemäß ${f.doc.number} prüfen` })),
      { title: "Endkontrolle und Dokumentation", description: "Prüfergebnisse dokumentieren, Abweichungen als Qualitätsmeldung erfassen.", expectedResult: "Alle Prüfpunkte i.O." },
    ];
    const warnings = ["Entwurf – enthält Platzhalter. Technische Prüfung, Freigabe und Veröffentlichung erfolgen ausschließlich durch berechtigte Personen."];
    if (!facts.length) warnings.push("Keine technischen Kennwerte in verknüpften Dokumenten gefunden – Schritte müssen vollständig manuell ergänzt werden.");
    if (docs.some((d) => d.status !== "APPROVED")) warnings.push("Mindestens ein Quelldokument ist nicht freigegeben.");
    return this.result(
      `Gliederungsvorschlag für eine Montageanweisung **${assembly.code} ${assembly.name}** (${steps.length} Schritte):\n${steps.map((s, i) => `${i + 1}. ${s.title}`).join("\n")}\n\nTechnische Werte werden nur wörtlich aus den Quelldokumenten zitiert; fehlende Angaben sind als Platzhalter markiert.`,
      docs.map((d): AiSource => ({ id: d.id, type: "document", code: d.number, title: d.title, href: `/documents/${d.id}`, caveat: d.status === "APPROVED" ? undefined : `Status ${d.status}` })).concat(chunks.filter((c) => !docs.some((d) => d.id === c.sourceId)).slice(0, 2).map((c) => this.toSource(c))),
      facts.length ? "medium" : "low",
      warnings,
      [{ kind: "createInstructionDraft", label: "Als Entwurf (Draft) anlegen", draft: { title: `Montageanweisung ${assembly.name} (KI-Entwurf)`, description: `Von ASSEMBLY AI (Demo) vorbereiteter Entwurf für ${assembly.code}. Nicht freigegeben.`, assemblyId: assembly.id, steps } }],
    );
  }
}
