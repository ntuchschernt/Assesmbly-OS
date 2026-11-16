import "server-only";
import { AnthropicProvider } from "./providers/anthropic";
import { DemoProvider } from "./providers/demo";
import { KeywordRetriever } from "./retrieval";
import type { AiAnswer, ChatTurn, LlmProvider } from "./types";

export function aiConfig() {
  const requested = process.env.AI_PROVIDER ?? "demo";
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  const active = requested === "anthropic" && hasKey ? "anthropic" : "demo";
  return { requested, active, hasKey, model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5" };
}

function provider(): LlmProvider {
  return aiConfig().active === "anthropic" ? new AnthropicProvider() : new DemoProvider();
}

const retriever = new KeywordRetriever();

/** Single entry point of the AI service module. */
export async function askAssistant(workspaceId: string, question: string, history: ChatTurn[] = []): Promise<AiAnswer> {
  return provider().answer({ workspaceId, question, history, retriever });
}
