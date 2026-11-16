import { requireContext } from "@/lib/auth/context";
import { aiConfig } from "@/lib/ai";
import { CopilotChat } from "@/components/copilot/copilot-chat";

export const metadata = { title: "AI Copilot" };

export default async function CopilotPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireContext();
  const { q } = await searchParams;
  const cfg = aiConfig();
  const label = cfg.active === "anthropic" ? `Anthropic Claude (${cfg.model})` : "Demo (lokal, kein LLM)";
  return <CopilotChat key={q ?? ""} initialQuestion={q} providerLabel={label} simulated={cfg.active !== "anthropic"} />;
}
