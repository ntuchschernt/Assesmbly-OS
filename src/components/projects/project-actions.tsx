"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, MoreHorizontal, Pencil } from "lucide-react";
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/use-action-form";
import { setProjectArchived } from "@/actions/projects";
import { ProjectFormDialog, type ProjectFormValues } from "./project-form-dialog";
import type { SelectOption } from "@/components/ui/input";

export function ProjectActions({
  id,
  archived,
  values,
  users,
  variant = "icon",
}: {
  id: string;
  archived: boolean;
  values: ProjectFormValues;
  users: SelectOption[];
  variant?: "icon" | "buttons";
}) {
  const [editing, setEditing] = useState(false);
  const router = useRouter();
  const { pending, run } = useAction();
  const archive = () => run(() => setProjectArchived(id, !archived), { onSuccess: () => router.refresh() });

  return (
    <>
      {variant === "buttons" ? (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={archive} loading={pending}>
            {archived ? <ArchiveRestore /> : <Archive />} {archived ? "Wiederherstellen" : "Archivieren"}
          </Button>
          <Button size="sm" onClick={() => setEditing(true)}>
            <Pencil /> Bearbeiten
          </Button>
        </div>
      ) : (
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Aktionen">
              <MoreHorizontal />
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem onSelect={() => setEditing(true)}>
              <Pencil /> Bearbeiten
            </DropdownItem>
            <DropdownItem onSelect={archive}>
              {archived ? <ArchiveRestore /> : <Archive />} {archived ? "Wiederherstellen" : "Archivieren"}
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      )}
      {editing && <EditDialog id={id} values={values} users={users} onClose={() => setEditing(false)} />}
    </>
  );
}

function EditDialog({ id, values, users, onClose }: { id: string; values: ProjectFormValues; users: SelectOption[]; onClose: () => void }) {
  return (
    <span onClick={(e) => e.stopPropagation()}>
      <ProjectFormDialogControlled id={id} values={values} users={users} onClose={onClose} />
    </span>
  );
}

function ProjectFormDialogControlled({ id, values, users, onClose }: { id: string; values: ProjectFormValues; users: SelectOption[]; onClose: () => void }) {
  return <ProjectFormDialog projectId={id} initial={values} users={users} defaultOpen onClosed={onClose} />;
}
