"use server";

import { z } from "zod";
import { requireContext } from "@/lib/auth/context";
import { askAssistant } from "@/lib/ai";
import { failure, safe, type ActionResult } from "@/lib/action-result";
import type { AiAnswer } from "@/lib/ai/types";

const schema = z.object({
  question: z.string().trim().min(2, "Bitte eine Frage eingeben.").max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) })).max(20).default([]),
});

export async function askAi(input: unknown): Promise<ActionResult<AiAnswer>> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = schema.safeParse(input);
    if (!parsed.success) return failure(parsed.error.issues[0]!.message);
    try {
      const answer = await askAssistant(ctx.workspaceId, parsed.data.question, parsed.data.history);
      return { ok: true, data: answer };
    } catch (e) {
      console.error("[ai]", e);
      return failure("Der KI-Dienst ist nicht erreichbar. Bitte später erneut versuchen.");
    }
  });
}
