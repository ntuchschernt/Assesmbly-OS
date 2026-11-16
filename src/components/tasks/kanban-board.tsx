"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DndContext, DragOverlay, PointerSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors, closestCorners, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { toast } from "sonner";
import { CalendarDays, MessageSquare, Paperclip, Plus } from "lucide-react";
import type { TaskStatus } from "@prisma/client";
import { moveTask } from "@/actions/tasks";
import { TASK_STATUS, TASK_STATUS_ORDER } from "@/lib/constants";
import { cn, formatDate, isOverdue } from "@/lib/utils";
import { Avatar } from "@/components/ui/misc";
import { PriorityIndicator } from "@/components/ui/priority";
import { Tag } from "@/components/ui/badge";
import type { TaskListItem } from "@/lib/services/tasks";

type Card = Pick<TaskListItem, "id" | "number" | "title" | "status" | "priority" | "labels" | "dueDate" | "position"> & {
  assignee: { name: string } | null;
  project: { key: string } | null;
  assembly: { code: string } | null;
  _count: { comments: number; attachments: number };
};

const COLUMN_ACCENT: Record<TaskStatus, string> = {
  OPEN: "bg-muted",
  IN_PROGRESS: "bg-primary",
  REVIEW: "bg-info",
  BLOCKED: "bg-danger",
  DONE: "bg-success",
};

export function KanbanBoard({ tasks, onCreate }: { tasks: Card[]; onCreate?: (status: TaskStatus) => void }) {
  const router = useRouter();
  const [items, setItems] = useState(tasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => setItems(tasks), [tasks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const columns = useMemo(() => {
    const map = Object.fromEntries(TASK_STATUS_ORDER.map((s) => [s, [] as Card[]])) as Record<TaskStatus, Card[]>;
    for (const t of [...items].sort((a, b) => a.position - b.position)) map[t.status].push(t);
    return map;
  }, [items]);
  const active = items.find((t) => t.id === activeId) ?? null;

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const id = String(e.active.id);
    const overId = String(e.over.id);
    const task = items.find((t) => t.id === id);
    if (!task) return;
    // Dropped on a column or on a card (insert before that card)
    const overTask = items.find((t) => t.id === overId);
    const status = (overTask ? overTask.status : overId) as TaskStatus;
    const beforeId = overTask && overTask.id !== id ? overTask.id : null;
    if (!beforeId && task.status === status) return;

    const prevItems = items;
    // optimistic update
    const col = columns[status].filter((t) => t.id !== id);
    const idx = beforeId ? col.findIndex((t) => t.id === beforeId) : col.length;
    const prevPos = idx > 0 ? col[idx - 1]!.position : null;
    const nextPos = beforeId ? col[idx]!.position : null;
    const position = prevPos === null && nextPos === null ? 1000 : prevPos === null ? nextPos! - 1000 : nextPos === null ? prevPos + 1000 : (prevPos + nextPos) / 2;
    setItems((cur) => cur.map((t) => (t.id === id ? { ...t, status, position } : t)));

    const res = await moveTask({ id, status, beforeId });
    if (!res.ok) {
      setItems(prevItems);
      toast.error(res.error);
    } else {
      if (res.message) toast.success(res.message);
      router.refresh();
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        {TASK_STATUS_ORDER.map((status) => (
          <Column key={status} status={status} count={columns[status].length} onCreate={onCreate}>
            {columns[status].map((t) => (
              <DraggableCard key={t.id} task={t} />
            ))}
          </Column>
        ))}
      </div>
      <DragOverlay>{active ? <TaskCard task={active} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}

function Column({ status, count, children, onCreate }: { status: TaskStatus; count: number; children: React.ReactNode; onCreate?: (s: TaskStatus) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-sidebar/70">
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <span className={cn("size-2 rounded-full", COLUMN_ACCENT[status])} />
        <h3 className="text-xs font-semibold uppercase tracking-wider">{TASK_STATUS[status].label}</h3>
        <span className="rounded bg-elevated px-1.5 font-mono text-2xs text-muted">{count}</span>
        {onCreate && (
          <button onClick={() => onCreate(status)} className="ml-auto rounded p-1 text-subtle hover:bg-elevated hover:text-fg cursor-pointer" aria-label={`Aufgabe in ${TASK_STATUS[status].label} anlegen`}>
            <Plus className="size-3.5" />
          </button>
        )}
      </header>
      <div ref={setNodeRef} className={cn("flex min-h-40 flex-1 flex-col gap-2 p-2 transition-colors", isOver && "bg-primary/5 outline outline-1 -outline-offset-1 outline-primary/40 rounded-b-lg")}>
        {children}
        {count === 0 && <p className="py-6 text-center text-xs text-subtle">Hierher ziehen</p>}
      </div>
    </section>
  );
}

function DraggableCard({ task }: { task: Card }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  const { setNodeRef: setDropRef } = useDroppable({ id: task.id });
  return (
    <div
      ref={(n) => {
        setNodeRef(n);
        setDropRef(n);
      }}
      {...attributes}
      {...listeners}
      className={cn("touch-none", isDragging && "opacity-30")}
    >
      <TaskCard task={task} />
    </div>
  );
}

function TaskCard({ task, dragging }: { task: Card; dragging?: boolean }) {
  const overdue = isOverdue(task.dueDate, task.status === "DONE");
  return (
    <article className={cn("group rounded-md border border-border bg-surface p-3 shadow-sm transition-colors hover:border-border-strong cursor-grab", dragging && "rotate-1 border-primary/50 shadow-xl shadow-black/40 cursor-grabbing", task.priority === "CRITICAL" && "border-l-2 border-l-danger")}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-2xs text-subtle">
          TSK-{task.number}
          {task.project && ` · ${task.project.key}`}
        </span>
        <PriorityIndicator priority={task.priority} showLabel={false} />
      </div>
      <Link href={`/tasks/${task.id}`} className="block text-sm leading-snug hover:text-primary" onPointerDown={(e) => e.stopPropagation()}>
        {task.title}
      </Link>
      {task.labels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.labels.slice(0, 3).map((l) => (
            <Tag key={l}>{l}</Tag>
          ))}
        </div>
      )}
      <div className="mt-2.5 flex items-center gap-3 text-2xs text-subtle">
        {task.dueDate && (
          <span className={cn("inline-flex items-center gap-1", overdue && "text-danger")}>
            <CalendarDays className="size-3" />
            {formatDate(task.dueDate)}
          </span>
        )}
        {task._count.comments > 0 && (
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="size-3" />
            {task._count.comments}
          </span>
        )}
        {task._count.attachments > 0 && (
          <span className="inline-flex items-center gap-1">
            <Paperclip className="size-3" />
            {task._count.attachments}
          </span>
        )}
        <span className="ml-auto">
          <Avatar name={task.assignee?.name} size="xs" />
        </span>
      </div>
    </article>
  );
}
