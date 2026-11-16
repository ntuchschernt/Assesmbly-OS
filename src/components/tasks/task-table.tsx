import Link from "next/link";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { UserChip } from "@/components/ui/misc";
import { PriorityIndicator } from "@/components/ui/priority";
import { TASK_STATUS } from "@/lib/constants";
import { formatDate, isOverdue } from "@/lib/utils";
import type { TaskListItem } from "@/lib/services/tasks";

export function TaskTable({ tasks }: { tasks: TaskListItem[] }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH>ID</TH>
          <TH>Aufgabe</TH>
          <TH>Status</TH>
          <TH>Priorität</TH>
          <TH>Verantwortlich</TH>
          <TH>Fällig</TH>
          <TH>Projekt / Baugruppe</TH>
          <TH>Labels</TH>
        </tr>
      </THead>
      <TBody>
        {tasks.map((t) => {
          const overdue = isOverdue(t.dueDate, t.status === "DONE");
          return (
            <TR key={t.id}>
              <TD className="font-mono text-2xs text-subtle">TSK-{t.number}</TD>
              <TD className="min-w-64">
                <Link href={`/tasks/${t.id}`} className="font-medium hover:text-primary">
                  {t.title}
                </Link>
              </TD>
              <TD><StatusBadge meta={TASK_STATUS[t.status]} /></TD>
              <TD><PriorityIndicator priority={t.priority} /></TD>
              <TD><UserChip name={t.assignee?.name} /></TD>
              <TD className={`whitespace-nowrap font-mono text-xs ${overdue ? "text-danger" : "text-muted"}`}>
                {formatDate(t.dueDate)}
                {overdue && " ⚠"}
              </TD>
              <TD className="text-xs text-muted">
                {t.project ? <Link href={`/projects/${t.project.id}`} className="hover:text-fg">{t.project.key}</Link> : "—"}
                {t.assembly && <> · <Link href={`/assembly/assemblies/${t.assembly.id}`} className="hover:text-fg">{t.assembly.code}</Link></>}
                {t.workOrder && <> · <Link href={`/assembly/work-orders/${t.workOrder.id}`} className="hover:text-fg">{t.workOrder.number}</Link></>}
              </TD>
              <TD>
                <div className="flex flex-wrap gap-1">
                  {t.labels.map((l) => (
                    <Tag key={l}>{l}</Tag>
                  ))}
                </div>
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
