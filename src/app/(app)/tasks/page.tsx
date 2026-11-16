import Link from "next/link";
import { Columns3, ListChecks, Plus, Rows3, UserRound } from "lucide-react";
import type { Priority, TaskStatus } from "@prisma/client";
import { requireContext } from "@/lib/auth/context";
import { allLabels, linkOptions, listTasks, type TaskListItem } from "@/lib/services/tasks";
import { userOptions } from "@/lib/services/users";
import { PageHeader, EmptyState, SegmentedLinks } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterBar, type FilterField } from "@/components/ui/filter-bar";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TasksBoardView } from "@/components/tasks/tasks-board-view";
import { TaskTable } from "@/components/tasks/task-table";
import { PRIORITY, TASK_STATUS, options } from "@/lib/constants";

export const metadata = { title: "Tasks" };

type SP = Record<string, string | undefined>;

export default async function TasksPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const ctx = await requireContext();
  const view = sp.view === "table" || sp.view === "mine" ? sp.view : "kanban";
  const [tasks, users, links, labels] = await Promise.all([
    listTasks(ctx.workspaceId, {
      q: sp.q,
      status: view === "kanban" ? undefined : (sp.status as TaskStatus | undefined),
      priority: sp.priority as Priority | undefined,
      assigneeId: view === "mine" ? ctx.user.id : sp.assignee,
      projectId: sp.project,
      label: sp.label,
      overdue: sp.overdue === "1",
    }),
    userOptions(),
    linkOptions(ctx.workspaceId),
    allLabels(ctx.workspaceId),
  ]);

  const qs = (v: string) => {
    const p = new URLSearchParams(Object.entries(sp).filter(([k, val]) => val && k !== "view") as [string, string][]);
    p.set("view", v);
    return `/tasks?${p.toString()}`;
  };

  const filters: FilterField[] = [
    { type: "search", key: "q", placeholder: "Titel, Beschreibung, TSK-Nr." },
    ...(view !== "kanban" ? [{ type: "select" as const, key: "status", placeholder: "Alle Status", options: options(TASK_STATUS) }] : []),
    { type: "select", key: "priority", placeholder: "Alle Prioritäten", options: options(PRIORITY) },
    ...(view !== "mine" ? [{ type: "select" as const, key: "assignee", placeholder: "Alle Personen", options: [{ value: "none", label: "Nicht zugewiesen" }, ...users] }] : []),
    { type: "select", key: "project", placeholder: "Alle Projekte", options: links.projects },
    { type: "select", key: "label", placeholder: "Alle Labels", options: labels.map((l) => ({ value: l, label: l })) },
    { type: "toggle", key: "overdue", label: "Nur überfällig" },
  ];

  return (
    <>
      <PageHeader
        title="Tasks"
        description="Aufgaben über alle Projekte, Baugruppen und Montageaufträge."
        actions={
          <>
            <SegmentedLinks
              active={view}
              items={[
                { key: "kanban", label: "Kanban", href: qs("kanban"), icon: <Columns3 /> },
                { key: "table", label: "Tabelle", href: qs("table"), icon: <Rows3 /> },
                { key: "mine", label: "Meine Aufgaben", href: qs("mine"), icon: <UserRound /> },
              ]}
            />
            <TaskFormDialog users={users} links={links} trigger={<Button><Plus /> Neue Aufgabe</Button>} />
          </>
        }
      />
      <FilterBar fields={filters} />
      {view === "kanban" ? (
        <TasksBoardView tasks={tasks} users={users} links={links} />
      ) : tasks.length === 0 ? (
        <EmptyState icon={<ListChecks />} title="Keine Aufgaben gefunden" description="Passe die Filter an oder erstelle eine neue Aufgabe." />
      ) : view === "table" ? (
        <Card>
          <TaskTable tasks={tasks} />
        </Card>
      ) : (
        <MyTasks tasks={tasks} />
      )}
    </>
  );
}

function MyTasks({ tasks }: { tasks: TaskListItem[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const week = new Date(today);
  week.setDate(week.getDate() + 7);
  const open = tasks.filter((t) => t.status !== "DONE");
  const groups = [
    { key: "overdue", title: "Überfällig", items: open.filter((t) => t.dueDate && t.dueDate < today) },
    { key: "week", title: "Nächste 7 Tage", items: open.filter((t) => t.dueDate && t.dueDate >= today && t.dueDate < week) },
    { key: "later", title: "Später", items: open.filter((t) => t.dueDate && t.dueDate >= week) },
    { key: "nodate", title: "Ohne Fälligkeit", items: open.filter((t) => !t.dueDate) },
    { key: "done", title: "Erledigt", items: tasks.filter((t) => t.status === "DONE") },
  ].filter((g) => g.items.length);
  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <Card key={g.key}>
          <CardHeader title={<span className={g.key === "overdue" ? "text-danger" : ""}>{g.title}</span>} action={<span className="font-mono text-xs text-muted">{g.items.length}</span>} />
          <TaskTable tasks={g.items} />
        </Card>
      ))}
      <p className="text-xs text-subtle">
        Tipp: Status direkt im <Link href="/tasks?view=kanban" className="text-primary">Kanban</Link> per Drag & Drop ändern.
      </p>
    </div>
  );
}
