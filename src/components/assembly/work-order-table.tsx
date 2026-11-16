import Link from "next/link";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Progress, UserChip } from "@/components/ui/misc";
import { PriorityIndicator } from "@/components/ui/priority";
import { INSTRUCTION_STATUS, WORK_ORDER_STATUS } from "@/lib/constants";
import { formatDate, formatHours, isOverdue } from "@/lib/utils";
import type { WorkOrderWithProgress } from "@/lib/services/work-orders";

export function WorkOrderTable({ orders }: { orders: WorkOrderWithProgress[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>Auftrag</TH>
          <TH>Baugruppe</TH>
          <TH>Status</TH>
          <TH className="min-w-36">Fortschritt</TH>
          <TH>Anweisung</TH>
          <TH>Zeit Ist / Plan</TH>
          <TH>Verantwortlich</TH>
          <TH>Fällig</TH>
        </tr>
      </THead>
      <TBody>
        {orders.map((w) => (
          <TR key={w.id}>
            <TD className="min-w-56">
              <Link href={`/assembly/work-orders/${w.id}`} className="group block">
                <span className="block font-mono text-2xs text-subtle">{w.number}</span>
                <span className="font-medium group-hover:text-primary">{w.title}</span>
              </Link>
            </TD>
            <TD className="text-xs">
              <Link href={`/assembly/assemblies/${w.assembly.id}`} className="hover:text-primary">
                <span className="font-mono text-subtle">{w.assembly.code}</span> {w.assembly.name}
              </Link>
              <span className="block text-subtle">{w.assembly.machine.code}</span>
            </TD>
            <TD>
              <div className="flex flex-col items-start gap-1">
                <StatusBadge meta={WORK_ORDER_STATUS[w.status]} />
                <PriorityIndicator priority={w.priority} />
              </div>
            </TD>
            <TD>
              <div className="flex items-center gap-2">
                <Progress value={w.progress} tone={w.progress === 100 ? "success" : "orange"} />
                <span className="w-9 text-right font-mono text-xs">{w.progress}%</span>
              </div>
              {w.totalSteps > 0 && <span className="text-2xs text-subtle">{w.doneSteps}/{w.totalSteps} Schritte</span>}
            </TD>
            <TD className="text-xs">
              {w.workInstruction ? (
                <Link href={`/work-instructions/${w.workInstruction.id}`} className="inline-flex flex-col gap-1 hover:text-primary">
                  <span className="font-mono">{w.workInstruction.number}</span>
                  {w.publishedVersion ? <span className="text-2xs text-success">gültig: v{w.publishedVersion}</span> : <StatusBadge meta={INSTRUCTION_STATUS[w.workInstruction.status]} />}
                </Link>
              ) : (
                <span className="text-subtle">—</span>
              )}
            </TD>
            <TD className={`whitespace-nowrap font-mono text-xs ${w.loggedMinutes / 60 > w.plannedHours ? "text-warning" : ""}`}>
              {formatHours(w.loggedMinutes)} / {w.plannedHours.toString().replace(".", ",")} h
            </TD>
            <TD><UserChip name={w.assignee?.name} /></TD>
            <TD className={`whitespace-nowrap font-mono text-xs ${isOverdue(w.dueDate, w.status === "COMPLETED") ? "text-danger" : "text-muted"}`}>{formatDate(w.dueDate)}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
