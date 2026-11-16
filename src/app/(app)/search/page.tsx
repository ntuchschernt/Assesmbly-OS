import Link from "next/link";
import { SearchX } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { globalSearch, SEARCH_CATEGORY_LABEL, type SearchCategory } from "@/lib/services/search";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterBar } from "@/components/ui/filter-bar";

export const metadata = { title: "Suche" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const ctx = await requireContext();
  const hits = await globalSearch(ctx.workspaceId, q, 25);
  const groups = (Object.keys(SEARCH_CATEGORY_LABEL) as SearchCategory[]).map((c) => ({ c, items: hits.filter((h) => h.category === c) })).filter((g) => g.items.length);

  return (
    <>
      <PageHeader title="Suche" description={q ? `${hits.length} Treffer für „${q}“ in ${groups.length} Kategorien` : "Durchsucht Projekte, Aufgaben, Maschinen, Baugruppen, Dokumente (inkl. Inhalt), Montageanweisungen und Qualitätsmeldungen."} />
      <FilterBar fields={[{ type: "search", key: "q", placeholder: "Suchbegriff (mind. 2 Zeichen)" }]} />
      {q.trim().length < 2 ? (
        <EmptyState title="Suchbegriff eingeben" description="Tipp: ⌘K / Strg+K öffnet die Schnellsuche von überall." />
      ) : groups.length === 0 ? (
        <EmptyState icon={<SearchX />} title={`Keine Treffer für „${q}“`} description="Andere Schreibweise oder Nummer (z. B. QM-0001, DOC-0004, TSK-3) versuchen." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((g) => (
            <Card key={g.c}>
              <CardHeader title={SEARCH_CATEGORY_LABEL[g.c]} action={<span className="font-mono text-xs text-muted">{g.items.length}</span>} />
              <ul className="divide-y divide-border">
                {g.items.map((h) => (
                  <li key={h.id}>
                    <Link href={h.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-elevated/40">
                      <span className="w-24 shrink-0 truncate font-mono text-2xs text-subtle">{h.code}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{h.title}</span>
                        {h.subtitle && <span className="block truncate text-xs text-subtle">{h.subtitle}</span>}
                      </span>
                      {h.status && <Badge tone="muted">{h.status.replace(/_/g, " ").toLowerCase()}</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
