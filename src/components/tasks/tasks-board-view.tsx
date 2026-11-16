"use client";

import { useState } from "react";
import type { TaskStatus } from "@prisma/client";
import { KanbanBoard } from "./kanban-board";
import { TaskFormDialog } from "./task-form-dialog";
import type { LinkOptions, TaskListItem } from "@/lib/services/tasks";
import type { SelectOption } from "@/components/ui/input";

/** Kanban plus the "+ in column" create dialog. */
export function TasksBoardView({ tasks, users, links }: { tasks: TaskListItem[]; users: SelectOption[]; links: LinkOptions }) {
  const [createIn, setCreateIn] = useState<TaskStatus | null>(null);
  return (
    <>
      <KanbanBoard tasks={tasks} onCreate={setCreateIn} />
      {createIn && (
        <TaskFormDialog
          key={createIn}
          open
          onOpenChange={(o) => !o && setCreateIn(null)}
          initial={{ status: createIn }}
          users={users}
          links={links}
          redirectOnCreate={false}
        />
      )}
    </>
  );
}
