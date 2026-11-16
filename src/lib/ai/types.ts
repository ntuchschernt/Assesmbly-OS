/** Shared types of the AI service module (provider-independent). */

export type SourceType = "document" | "assembly" | "quality" | "instruction" | "task" | "project" | "workOrder";

export type RetrievedChunk = {
  sourceId: string;
  type: SourceType;
  code: string;
  title: string;
  href: string;
  text: string;
  score: number;
  /** e.g. "nicht freigegeben" – shown next to the source so users can weigh it */
  caveat?: string;
};

export type AiSource = { id: string; type: SourceType; code: string; title: string; href: string; excerpt?: string; caveat?: string };

/** An action the assistant PROPOSES. It is never executed automatically – a human must click it. */
export type SuggestedAction =
  | { kind: "createTask"; label: string; task: { title: string; description: string; priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; projectId?: string; assemblyId?: string; workOrderId?: string; labels: string } }
  | { kind: "createInstructionDraft"; label: string; draft: { title: string; description: string; assemblyId?: string; steps: { title: string; description: string; expectedResult?: string }[] } };

export type Confidence = "high" | "medium" | "low" | "none";

export type AiAnswer = {
  text: string;
  sources: AiSource[];
  confidence: Confidence;
  /** true when no language model produced the text (demo provider) */
  simulated: boolean;
  provider: string;
  warnings: string[];
  actions: SuggestedAction[];
};

export type ChatTurn = { role: "user" | "assistant"; content: string };

export interface Retriever {
  retrieve(workspaceId: string, query: string, limit?: number): Promise<RetrievedChunk[]>;
}

export interface LlmProvider {
  readonly name: string;
  readonly simulated: boolean;
  answer(input: { workspaceId: string; question: string; history: ChatTurn[]; retriever: Retriever }): Promise<AiAnswer>;
}
