/** Pure text helpers for retrieval (unit-tested). */

const STOPWORDS = new Set(
  "der die das und oder ein eine einer eines einem einen ist sind wie was wo wer welche welcher welches mit für fur von zu zum zur im in am an auf aus bei bitte mir mich ich du sie es den dem des nicht kein keine auch noch nur über ueber unter gibt gib zeige zeig sag sage fasse zusammen kannst können koennen hat haben wird werden the a an of to is are what which how for".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9ß.\-×]+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ""))
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

/** Simple lexical relevance: matched query terms weighted by rarity-ish length, prefix matches count half. */
export function scoreText(queryTerms: string[], text: string): number {
  if (!queryTerms.length) return 0;
  const tokens = tokenize(text);
  const set = new Set(tokens);
  let score = 0;
  for (const q of queryTerms) {
    if (set.has(q)) score += 1 + Math.min(q.length, 10) / 10;
    else if (q.length >= 4 && tokens.some((t) => t.startsWith(q) || q.startsWith(t) && t.length >= 4)) score += 0.5;
  }
  return score;
}

/** Sentences of `text` that contain at least one query term, best first. */
export function relevantSentences(queryTerms: string[], text: string, max = 3): string[] {
  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  return sentences
    .map((s) => ({ s, score: scoreText(queryTerms, s) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.s);
}

/** Extracts entity codes like QM-0001, DOC-0004, WI-0002, WO-2026-0142, TSK-5, VX4-100. */
export function extractCodes(text: string) {
  const up = text.toUpperCase();
  return {
    quality: up.match(/QM-\d{4}/g) ?? [],
    documents: up.match(/DOC-\d{4}/g) ?? [],
    instructions: up.match(/WI-\d{4}/g) ?? [],
    workOrders: up.match(/WO-\d{4}-\d{4}/g) ?? [],
    tasks: (up.match(/TSK-\d+/g) ?? []).map((t) => Number(t.slice(4))),
  };
}
