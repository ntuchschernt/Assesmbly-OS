import { Fragment } from "react";

/** Minimal, safe markdown subset (bold, italic, bullets, numbered lists, paragraphs). No HTML injection. */
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold text-fg">{p.slice(2, -2)}</strong> : p.startsWith("_") && p.endsWith("_") && p.length > 2 ? <em key={i} className="text-muted">{p.slice(1, -1)}</em> : <Fragment key={i}>{p}</Fragment>,
  );
}

export function MiniMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2.5 text-sm leading-relaxed">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*- /.test(l) || /^\s{2,}\S/.test(l))) {
          const items: string[] = [];
          for (const l of lines) {
            if (/^\s*- /.test(l)) items.push(l.replace(/^\s*- /, ""));
            else items[items.length - 1] += "\n" + l.trim();
          }
          return (
            <ul key={bi} className="list-disc space-y-1 pl-5 marker:text-subtle">
              {items.map((it, i) => <li key={i} className="whitespace-pre-line">{inline(it)}</li>)}
            </ul>
          );
        }
        const head = lines[0] ?? "";
        const rest = lines.slice(1);
        if (rest.length && rest.every((l) => /^\s*(- |\d+\. )/.test(l))) {
          const ordered = /^\s*\d+\. /.test(rest[0]!);
          const Tag = ordered ? "ol" : "ul";
          return (
            <div key={bi}>
              <p>{inline(head)}</p>
              <Tag className={`mt-1 space-y-1 pl-5 marker:text-subtle ${ordered ? "list-decimal" : "list-disc"}`}>
                {rest.map((l, i) => <li key={i}>{inline(l.replace(/^\s*(- |\d+\. )/, ""))}</li>)}
              </Tag>
            </div>
          );
        }
        return <p key={bi} className="whitespace-pre-line">{inline(block)}</p>;
      })}
    </div>
  );
}
