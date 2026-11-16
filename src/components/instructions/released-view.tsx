import Link from "next/link";
import { AlertTriangle, BadgeCheck, HardHat, Package, Target, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { InstructionSnapshot } from "@/lib/services/instruction-snapshot";
import { formatDate } from "@/lib/utils";

/** Read-only rendering of an immutable instruction snapshot (document style, printable). */
export function ReleasedView({ snapshot, publishedAt, valid }: { snapshot: InstructionSnapshot; publishedAt: Date; valid: boolean }) {
  const s = snapshot;
  return (
    <article className="rounded-lg border border-border bg-surface print:border-0 print:bg-white print:text-black">
      <header className="border-b border-border p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-subtle">{s.number}</span>
          <Badge tone={valid ? "success" : "muted"}>Version {s.version}</Badge>
          {valid && <Badge tone="success" dot>Gültig für Produktion</Badge>}
        </div>
        <h1 className="mt-2 text-xl font-semibold sm:text-2xl">{s.title}</h1>
        {s.description && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{s.description}</p>}
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
          <div><dt className="label-caps">Baugruppe</dt><dd className="mt-1">{s.assembly ? <Link href={`/assembly/assemblies/${s.assembly.id}`} className="hover:text-primary">{s.assembly.code} · {s.assembly.name}</Link> : "—"}</dd></div>
          <div><dt className="label-caps">Freigabe</dt><dd className="mt-1 flex items-center gap-1">{s.approvedByName ? <><BadgeCheck className="size-3.5 text-success" />{s.approvedByName} · {formatDate(s.approvedAt)}</> : "—"}</dd></div>
          <div><dt className="label-caps">Veröffentlicht</dt><dd className="mt-1">{formatDate(publishedAt)}</dd></div>
        </dl>
      </header>
      {s.safetyNotes && (
        <div className="m-5 flex gap-3 rounded-md border border-warning/50 bg-warning/10 px-4 py-3 text-sm sm:m-6">
          <HardHat className="mt-0.5 size-5 shrink-0 text-warning" />
          <div><p className="font-semibold text-warning">Sicherheitshinweise</p><p className="mt-0.5">{s.safetyNotes}</p></div>
        </div>
      )}
      <div className="grid gap-4 px-5 sm:grid-cols-2 sm:px-6">
        <List icon={<Wrench />} title="Werkzeuge" items={s.tools} />
        <List icon={<Package />} title="Material" items={s.materials} />
      </div>
      <ol className="mt-6 divide-y divide-border border-t border-border">
        {s.steps.map((st) => (
          <li key={st.id} className="flex gap-4 p-5 sm:p-6">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-elevated font-mono text-sm font-semibold">{st.order}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{st.title}</h3>
                {st.isCheckpoint && <Badge tone="info">Prüfpunkt</Badge>}
                {st.safetyCritical && <Badge tone="danger"><AlertTriangle className="size-3" /> Sicherheitskritisch</Badge>}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-fg/90">{st.description}</p>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                {st.tools.length > 0 && <span><Wrench className="mr-1 inline size-3" />{st.tools.join(", ")}</span>}
                {st.parts.length > 0 && <span><Package className="mr-1 inline size-3" />{st.parts.join(", ")}</span>}
                {st.responsibleName && <span>Verantwortlich: {st.responsibleName}</span>}
              </div>
              {st.expectedResult && <p className="mt-2 flex gap-1.5 text-sm"><Target className="mt-0.5 size-3.5 shrink-0 text-info" /><span><span className="text-info">Erwartet:</span> {st.expectedResult}</span></p>}
              {st.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={st.imageUrl} alt={`Abbildung zu Schritt ${st.order}`} className="mt-3 max-h-64 rounded-md border border-border" />
              )}
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}

function List({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="rounded-md bg-elevated/50 p-3">
      <div className="label-caps mb-2 flex items-center gap-1.5 [&_svg]:size-3">{icon} {title}</div>
      <ul className="space-y-1 text-sm">{items.length ? items.map((i) => <li key={i}>{i}</li>) : <li className="text-muted">—</li>}</ul>
    </div>
  );
}
