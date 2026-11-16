/**
 * Document processing pipeline (RAG preparation).
 *
 *   upload → extractText() → chunkText() → [embed() → vector store]   (embedding: future)
 *
 * MVP: text-based formats are extracted directly. Binary formats (PDF, DWG, images) are marked
 * as "not processed" – a PDF/OCR extractor can be plugged in via the `TextExtractor` interface.
 */
export interface TextExtractor {
  supports(mimeType: string): boolean;
  extract(data: Buffer, mimeType: string): Promise<string>;
}

export const plainTextExtractor: TextExtractor = {
  supports: (m) => m.startsWith("text/") || m === "application/json",
  extract: async (data) => data.toString("utf8"),
};

const extractors: TextExtractor[] = [plainTextExtractor];

export async function extractText(data: Buffer, mimeType: string): Promise<string | null> {
  const ex = extractors.find((e) => e.supports(mimeType));
  if (!ex) return null;
  const text = (await ex.extract(data, mimeType)).replace(/\u0000/g, "").trim();
  return text.slice(0, 100_000) || null;
}

export type Chunk = { index: number; text: string };

/** Splits text into overlapping chunks on sentence boundaries (for retrieval / embeddings). */
export function chunkText(text: string, maxChars = 600, overlap = 100): Chunk[] {
  const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?;:])\s+/).filter(Boolean);
  const chunks: Chunk[] = [];
  let current = "";
  for (const s of sentences) {
    if (current && (current + " " + s).length > maxChars) {
      chunks.push({ index: chunks.length, text: current.trim() });
      current = current.slice(-overlap) + " " + s;
    } else {
      current = current ? `${current} ${s}` : s;
    }
  }
  if (current.trim()) chunks.push({ index: chunks.length, text: current.trim() });
  return chunks;
}
