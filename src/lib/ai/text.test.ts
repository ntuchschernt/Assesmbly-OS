import { describe, expect, it } from "vitest";
import { extractCodes, relevantSentences, scoreText, tokenize } from "./text";
import { chunkText } from "./processing";

describe("tokenize", () => {
  it("lowercases, strips accents and stopwords", () => {
    expect(tokenize("Welches Anzugsmoment gilt für die Fußschrauben?")).toEqual(["anzugsmoment", "gilt", "fußschrauben"].map((t) => t.normalize("NFKD").replace(/[̀-ͯ]/g, "")));
  });
});

describe("scoreText / relevantSentences", () => {
  it("scores exact and prefix matches", () => {
    expect(scoreText(["anzugsmoment"], "Anzugsmoment 85 Nm")).toBeGreaterThan(1);
    expect(scoreText(["pumpe"], "Vakuumpumpe")).toBe(0);
    expect(scoreText(["pump"], "Pumpenkonsole")).toBe(0.5);
    expect(scoreText(["xyz"], "nothing")).toBe(0);
  });
  it("returns only matching sentences, best first", () => {
    const s = relevantSentences(["anzugsmoment"], "Gewicht 210 kg. Befestigung M12, Anzugsmoment 85 Nm. Öl 4,5 l.");
    expect(s).toEqual(["Befestigung M12, Anzugsmoment 85 Nm."]);
  });
});

describe("extractCodes", () => {
  it("finds entity numbers", () => {
    const c = extractCodes("Fasse QM-0001 und doc-0004 zusammen, WO-2026-0142, TSK-12, WI-0003");
    expect(c.quality).toEqual(["QM-0001"]);
    expect(c.documents).toEqual(["DOC-0004"]);
    expect(c.workOrders).toEqual(["WO-2026-0142"]);
    expect(c.tasks).toEqual([12]);
    expect(c.instructions).toEqual(["WI-0003"]);
  });
});

describe("chunkText", () => {
  it("splits long text into bounded chunks", () => {
    const text = Array.from({ length: 40 }, (_, i) => `Satz Nummer ${i} mit etwas Inhalt.`).join(" ");
    const chunks = chunkText(text, 200, 40);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks.every((c) => c.text.length <= 260)).toBe(true);
  });
});
