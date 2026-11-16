import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import type { InstructionStatus } from "@prisma/client";
import { requireContext } from "@/lib/auth/context";
import { getPublishedRevisions, listInstructions } from "@/lib/services/instructions";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { INSTRUCTION_STATUS, options } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Work Instructions" };

export default async function InstructionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requireContext();
  const c = sp.q ? { contains: sp.q, mode: "insensitive" as const } : undefined;
  const list = await listInstructions(ctx.workspaceId, {
    ...(sp.status ? { status: sp.status as InstructionStatus } : {}),
    ...(c ? { OR: [{ title: c }, { number: c }, { description: c }] } : {}),
  });
  const published = await getPublishedRevisions(list.map((w) => w.id));

  return (
    <>
      <PageHeader
        title="Work Instructions"
        description="Digitale Montageanweisungen mit Prüf- und Freigabeprozess. In der Produktion ist ausschließlich die veröffentlichte Version gültig."
        actions={<Link href="/work-instructions/new" className={buttonVariants()}><Plus /> Neue Anweisung</Link>}
      />
      <FilterBar fields={[{ type: "search", key: "q", placeholder: "Nummer oder Titel" }, { type: "select", key: "status", placeholder: "Alle Status", options: options(INSTRUCTION_STATUS) }]} />
      {list.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title="Keine Montageanweisungen" description="Erstelle die erste digitale Montageanweisung." action={<Link href="/work-instructions/new" className={buttonVariants()}>Anweisung erstellen</Link>} />
      ) : (
        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Anweisung</TH>
                <TH>Baugruppe</TH>
                <TH>Arbeitsstand</TH>
                <TH>Gültig in Produktion</TH>
                <TH className="text-right">Schritte</TH>
                <TH className="text-right">Aufträge</TH>
                <TH>Autor</TH>
                <TH>Geändert</TH>
              </tr>
            </THead>
            <TBody>
              {list.map((w) => {
                const rev = published.get(w.id);
                return (
                  <TR key={w.id}>
                    <TD className="min-w-64">
                      <Link href={`/work-instructions/${w.id}`} className="group block">
                        <span className="block font-mono text-2xs text-subtle">{w.number}</span>
                        <span className="font-medium group-hover:text-primary">{w.title}</span>
                      </Link>
                    </TD>
                    <TD className="text-xs text-muted">{w.assembly ? `${w.assembly.code} ${w.assembly.name}` : "—"}</TD>
                    <TD><span className="mr-2 font-mono text-xs">v{w.version}</span><StatusBadge meta={INSTRUCTION_STATUS[w.status]} /></TD>
                    <TD>
                      {rev ? (
                        <Link href={`/work-instructions/${w.id}/released`} className="font-mono text-xs text-success hover:underline">v{rev.version} · {formatDate(rev.createdAt)}</Link>
                      ) : (
                        <span className="text-xs text-subtle">keine freigegebene Version</span>
                      )}
                    </TD>
                    <TD className="text-right font-mono text-xs">{w._count.steps}</TD>
                    <TD className="text-right font-mono text-xs">{w._count.workOrders}</TD>
                    <TD className="text-xs">{w.author?.name ?? "—"}</TD>
                    <TD className="font-mono text-xs text-muted">{formatDate(w.updatedAt)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}
    </>
  );
}
