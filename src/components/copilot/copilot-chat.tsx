"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowUp, Bot, ClipboardList, FileText, ListPlus, Loader2, RotateCcw, ShieldCheck, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { askAi } from "@/actions/ai";
import { saveTask } from "@/actions/tasks";
import { saveInstruction } from "@/actions/instructions";
import type { AiAnswer, ChatTurn, Confidence, SuggestedAction } from "@/lib/ai/types";
import { MiniMarkdown } from "./mini-markdown";
import { cn } from "@/lib/utils";

type Msg = { id: string; role: "user"; content: string } | { id: string; role: "assistant"; content: string; answer?: AiAnswer; error?: string };

const PROMPTS = [
  "Fasse die offenen Qualitätsmeldungen zusammen",
  "Welches Anzugsmoment gilt für die Fußschrauben der Vakuumpumpe?",
  "Analysiere den Projektstatus VX-400",
  "Schlage Aufgaben aus offenen Problemen vor",
  "Bereite eine Montageanweisung für die Ventileinheit vor",
  "Fasse DOC-0004 zusammen",
  "Welcher Betriebsdruck gilt für den Hydrauliktank?",
];

const CONF: Record<Confidence, { label: string; tone: "success" | "info" | "warning" | "danger" }> = {
  high: { label: "Hohe Sicherheit · belegt", tone: "success" },
  medium: { label: "Mittlere Sicherheit", tone: "info" },
  low: { label: "Unsicher – prüfen", tone: "warning" },
  none: { label: "Keine belastbare Antwort", tone: "danger" },
};

let seq = 0;
const uid = () => `m${Date.now()}-${seq++}`;

export function CopilotChat({ initialQuestion, providerLabel, simulated }: { initialQuestion?: string; providerLabel: string; simulated: boolean }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  const send = (question: string) => {
    const q = question.trim();
    if (q.length < 2 || pending) return;
    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { id: uid(), role: "user", content: q }]);
    setInput("");
    start(async () => {
      const res = await askAi({ question: q, history });
      setMessages((m) => [...m, res.ok ? { id: uid(), role: "assistant", content: res.data!.text, answer: res.data } : { id: uid(), role: "assistant", content: "", error: res.error }]);
    });
  };

  useEffect(() => {
    if (initialQuestion && !asked.current) {
      asked.current = true;
      send(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  return (
    <div className="flex h-[calc(100dvh-9.5rem)] min-h-[520px] flex-col rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary"><Sparkles className="size-4" /></span>
          <div>
            <div className="text-sm font-semibold">ASSEMBLY AI</div>
            <div className="text-2xs text-muted">Provider: {providerLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {simulated && <Badge tone="warning">Simulierte Antworten</Badge>}
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setMessages([])} disabled={pending}><RotateCcw /> Neu</Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="mx-auto max-w-2xl">
            <div className="rounded-lg border border-border bg-elevated/40 p-4 text-sm">
              <p className="flex items-center gap-2 font-medium"><ShieldCheck className="size-4 text-success" /> Sicherheitsregeln</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
                <li>Antworten basieren auf dem Datenbestand und nennen ihre Quellen.</li>
                <li>Fehlende technische Angaben werden nicht erfunden; Unsicherheit wird gekennzeichnet.</li>
                <li>Keine Freigabe von Dokumenten und keine automatische Änderung von Montageanweisungen – Vorschläge werden erst nach deiner Bestätigung angelegt.</li>
                {simulated && <li className="text-warning">Demo-Modus: Es wird kein Sprachmodell aufgerufen. Antworten werden regelbasiert aus echten Datensätzen erzeugt.</li>}
              </ul>
            </div>
            <p className="label-caps mb-2 mt-6">Beispiele</p>
            <div className="flex flex-wrap gap-2">
              {PROMPTS.map((p) => (
                <button key={p} onClick={() => send(p)} className="rounded-md border border-border bg-surface px-3 py-2 text-left text-xs text-fg/90 hover:border-primary/50 hover:bg-primary/5 cursor-pointer">{p}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((m) => (m.role === "user" ? <UserBubble key={m.id} text={m.content} /> : <AssistantBubble key={m.id} msg={m} />))}
            {pending && (
              <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="size-4 animate-spin" /> Durchsuche Datenbestand…</div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form
        className="border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="flex items-end gap-2 rounded-md border border-border bg-bg/60 p-2 focus-within:border-primary">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Frage zu Baugruppen, Dokumenten, Qualität oder Projekten…"
            aria-label="Frage an ASSEMBLY AI"
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none placeholder:text-subtle"
          />
          <Button type="submit" size="icon" disabled={pending || input.trim().length < 2} aria-label="Senden"><ArrowUp /></Button>
        </div>
        <p className="mt-1.5 px-1 text-2xs text-subtle">Enter zum Senden · Shift+Enter für neue Zeile · KI-Antworten ersetzen keine Prüfung durch Fachpersonal.</p>
      </form>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end gap-3">
      <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-elevated px-3.5 py-2.5 text-sm">{text}</div>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-muted"><User className="size-3.5" /></span>
    </div>
  );
}

function AssistantBubble({ msg }: { msg: Extract<Msg, { role: "assistant" }> }) {
  const a = msg.answer;
  return (
    <div className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"><Bot className="size-3.5" /></span>
      <div className="min-w-0 flex-1 rounded-lg rounded-tl-sm border border-border bg-bg/40 p-3.5">
        {msg.error ? (
          <p className="text-sm text-danger">{msg.error}</p>
        ) : a ? (
          <>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {a.simulated && <Badge tone="warning">Simuliert · Demo-Provider</Badge>}
              <Badge tone={CONF[a.confidence].tone} dot>{CONF[a.confidence].label}</Badge>
            </div>
            <MiniMarkdown text={a.text} />
            {a.warnings.length > 0 && (
              <ul className="mt-3 space-y-1">
                {a.warnings.map((w) => (
                  <li key={w} className="flex gap-1.5 text-xs text-warning"><AlertTriangle className="mt-0.5 size-3 shrink-0" /> {w}</li>
                ))}
              </ul>
            )}
            {a.sources.length > 0 && (
              <div className="mt-3 border-t border-border pt-2.5">
                <div className="label-caps mb-1.5">Quellen</div>
                <ol className="space-y-1">
                  {a.sources.map((s, i) => (
                    <li key={`${s.id}-${i}`} className="text-xs">
                      <Link href={s.href} className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover">
                        <FileText className="size-3" /> [{i + 1}] <span className="font-mono">{s.code}</span> <span className="text-fg/80">{s.title}</span>
                      </Link>
                      {s.caveat && <span className="ml-1.5 text-warning">· {s.caveat}</span>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {a.actions.length > 0 && <ActionList actions={a.actions} />}
          </>
        ) : null}
      </div>
    </div>
  );
}

/** Proposed actions – executed only after an explicit click (human-in-the-loop). */
function ActionList({ actions }: { actions: SuggestedAction[] }) {
  const router = useRouter();
  const [done, setDone] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const run = async (i: number, a: SuggestedAction) => {
    setBusy(i);
    try {
      if (a.kind === "createTask") {
        const res = await saveTask(null, { ...a.task, status: "OPEN", assigneeId: "", dueDate: "" });
        if (res.ok) {
          toast.success(res.message);
          setDone((d) => ({ ...d, [i]: `/tasks/${res.data!.id}` }));
        } else toast.error(res.error);
      } else {
        const res = await saveInstruction(null, { ...a.draft, tools: [], materials: [], safetyNotes: "", imageUrls: [], steps: a.draft.steps.map((s) => ({ ...s, tools: [], parts: [], isCheckpoint: false, safetyCritical: false })) });
        if (res.ok) {
          toast.success(`${res.message} – bitte fachlich prüfen.`);
          router.push(`/work-instructions/${res.data!.id}`);
        } else toast.error(res.error);
      }
    } finally {
      setBusy(null);
    }
  };
  return (
    <div className="mt-3 border-t border-border pt-2.5">
      <div className="label-caps mb-1.5">Vorgeschlagene Aktionen · Bestätigung erforderlich</div>
      <div className="flex flex-col gap-1.5">
        {actions.map((a, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs">
            {a.kind === "createTask" ? <ListPlus className="size-3.5 text-muted" /> : <ClipboardList className="size-3.5 text-muted" />}
            <span className="min-w-0 flex-1 truncate">{a.label}</span>
            {done[i] ? (
              <Link href={done[i]} className="text-success hover:underline">angelegt → öffnen</Link>
            ) : (
              <Button size="sm" variant="secondary" className={cn("h-7")} loading={busy === i} disabled={busy !== null} onClick={() => run(i, a)}>
                {a.kind === "createTask" ? "Aufgabe anlegen" : "Entwurf anlegen"}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
