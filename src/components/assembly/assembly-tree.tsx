import Link from "next/link";
import { ChevronRight, Cpu, Boxes, Box } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";
import { ASSEMBLY_STATUS, MACHINE_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AssemblyTree as Tree } from "@/lib/services/assembly";

/** Collapsible Project → Machine → Assembly → Subassembly hierarchy (native <details>, no JS needed). */
export function AssemblyTree({ tree, activeMachineId }: { tree: Tree; activeMachineId?: string }) {
  if (!tree.length) return <p className="p-4 text-sm text-muted">Keine Projekte mit Maschinen.</p>;
  return (
    <div className="space-y-3 p-3">
      {tree.map((p) => (
        <div key={p.id}>
          <Link href={`/projects/${p.id}`} className="label-caps mb-1.5 block px-1 hover:!text-fg">
            {p.key} · {p.name}
          </Link>
          {p.machines.length === 0 && <p className="px-1 text-xs text-subtle">Keine Maschinen</p>}
          {p.machines.map((m) => (
            <details key={m.id} open className="group/m mb-1">
              <summary className={cn("flex cursor-pointer list-none items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-elevated", activeMachineId === m.id && "bg-primary/10")}>
                <ChevronRight className="size-3.5 text-subtle transition-transform group-open/m:rotate-90" />
                <Cpu className="size-4 text-primary" />
                <Link href={`/assembly?machine=${m.id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary">
                  <span className="mr-1.5 font-mono text-2xs text-subtle">{m.code}</span>
                  {m.name}
                </Link>
                <StatusBadge meta={MACHINE_STATUS[m.status]} />
              </summary>
              <ul className="ml-[18px] border-l border-border pl-2">
                {m.assemblies.length === 0 && <li className="py-1 pl-2 text-xs text-subtle">Keine Baugruppen</li>}
                {m.assemblies.map((a) => (
                  <li key={a.id}>
                    <Link href={`/assembly/assemblies/${a.id}`} className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-elevated">
                      <Boxes className="size-3.5 text-muted" />
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <span className="mr-1.5 font-mono text-2xs text-subtle">{a.code}</span>
                        {a.name}
                      </span>
                      {a._count.qualityIssues > 0 && <span className="rounded bg-danger/15 px-1 font-mono text-2xs text-danger" title="Offene QM-Meldungen">{a._count.qualityIssues}</span>}
                      <StatusBadge meta={ASSEMBLY_STATUS[a.status]} />
                    </Link>
                    {a.children.length > 0 && (
                      <ul className="ml-4 border-l border-border pl-2">
                        {a.children.map((c) => (
                          <li key={c.id}>
                            <Link href={`/assembly/assemblies/${c.id}`} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-elevated">
                              <Box className="size-3 text-subtle" />
                              <span className="min-w-0 flex-1 truncate text-xs text-muted">
                                <span className="mr-1.5 font-mono text-subtle">{c.code}</span>
                                {c.name}
                              </span>
                              <span className={cn("size-1.5 rounded-full", { PLANNED: "bg-muted", IN_PROGRESS: "bg-primary", BLOCKED: "bg-danger", COMPLETED: "bg-success" }[c.status])} title={ASSEMBLY_STATUS[c.status].label} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      ))}
    </div>
  );
}
