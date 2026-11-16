import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AiAnswer, ChatTurn, LlmProvider, Retriever } from "../types";

const SYSTEM_PROMPT = `Du bist ASSEMBLY AI, der Assistent der Industrieplattform ASSEMBLY OS (Maschinen- und Anlagenbau).
Regeln, die immer gelten:
- Antworte ausschließlich auf Basis der mitgelieferten QUELLEN. Zitiere jede technische Angabe mit der Quellennummer, z. B. [1].
- Erfinde niemals technische Werte (Drehmomente, Toleranzen, Drücke, Maße, Materialien). Fehlt eine Angabe in den Quellen, sage das ausdrücklich.
- Wenn die Quellen widersprüchlich, unvollständig oder nicht freigegeben sind, kennzeichne die Antwort als unsicher.
- Du gibst keine Dokumente oder Montageanweisungen frei und änderst keine sicherheitskritischen Inhalte. Du machst nur Vorschläge; Entscheidungen treffen Menschen.
- Antworte knapp und sachlich auf Deutsch. Verwende Aufzählungen mit "- " und **fett** für Schlüsselbegriffe.`;

/**
 * Real LLM provider (Claude via the official Anthropic SDK). Active only with AI_PROVIDER=anthropic and a key.
 * Retrieval is identical to the demo provider, so every answer carries the same verifiable sources.
 */
export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  readonly simulated = false;
  private client = new Anthropic();
  private model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

  async answer({ workspaceId, question, history, retriever }: { workspaceId: string; question: string; history: ChatTurn[]; retriever: Retriever }): Promise<AiAnswer> {
    const chunks = await retriever.retrieve(workspaceId, question, 8);
    const sourcesBlock = chunks.length
      ? chunks.map((c, i) => `[${i + 1}] ${c.code} – ${c.title}${c.caveat ? ` (ACHTUNG: ${c.caveat})` : ""}\n${c.text}`).join("\n\n")
      : "(keine passenden Quellen gefunden)";
    const messages: Anthropic.Beta.BetaMessageParam[] = [
      ...history.slice(-8).map((t) => ({ role: t.role, content: t.content })),
      { role: "user", content: `QUELLEN:\n${sourcesBlock}\n\nFRAGE:\n${question}` },
    ];

    const response = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: { effort: "medium" },
      // Refusal fallback: on a policy decline the API retries on a suitable fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages,
    });

    const sources = chunks.map((c) => ({ id: c.sourceId, type: c.type, code: c.code, title: c.title, href: c.href, caveat: c.caveat }));
    if (response.stop_reason === "refusal") {
      return { text: "Diese Anfrage kann ich nicht beantworten.", sources: [], confidence: "none", simulated: false, provider: this.name, warnings: ["Anfrage wurde vom Modell abgelehnt."], actions: [] };
    }
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    const warnings: string[] = [];
    if (!chunks.length) warnings.push("Keine Quellen gefunden – Antwort nicht durch Datenbestand belegt.");
    if (chunks.some((c) => c.caveat)) warnings.push("Mindestens eine Quelle ist nicht freigegeben.");
    if (response.stop_reason === "max_tokens") warnings.push("Antwort wurde gekürzt.");
    return {
      text: text || "Keine Antwort erhalten.",
      sources,
      confidence: !chunks.length ? "none" : warnings.length ? "low" : "medium",
      simulated: false,
      provider: `${this.name} (${response.model})`,
      warnings,
      actions: [],
    };
  }
}
