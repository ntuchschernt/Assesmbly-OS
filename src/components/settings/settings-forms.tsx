"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { useActionForm } from "@/components/ui/use-action-form";
import { changePassword, createWorkspace, updateProfile, updateWorkspace } from "@/actions/settings";

export function ProfileForm({ name, title }: { name: string; title: string }) {
  const router = useRouter();
  const f = useActionForm({ name, title });
  return (
    <form noValidate className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); f.submit(updateProfile, { onSuccess: () => router.refresh() }); }}>
      <Field label="Name" required error={f.errors.name}><Input {...f.bind("name")} /></Field>
      <Field label="Funktion / Titel" error={f.errors.title}><Input {...f.bind("title")} /></Field>
      <div className="sm:col-span-2"><Button type="submit" size="sm" loading={f.pending}>Profil speichern</Button></div>
    </form>
  );
}

export function PasswordForm() {
  const f = useActionForm({ current: "", next: "", confirm: "" });
  return (
    <form noValidate className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); f.submit(changePassword, { onSuccess: () => f.reset() }); }}>
      <Field label="Aktuelles Passwort" error={f.errors.current}><Input type="password" autoComplete="current-password" {...f.bind("current")} /></Field>
      <Field label="Neues Passwort" error={f.errors.next} hint="Mindestens 8 Zeichen"><Input type="password" autoComplete="new-password" {...f.bind("next")} /></Field>
      <Field label="Wiederholen" error={f.errors.confirm}><Input type="password" autoComplete="new-password" {...f.bind("confirm")} /></Field>
      <div className="sm:col-span-3"><Button type="submit" size="sm" variant="secondary" loading={f.pending}>Passwort ändern</Button></div>
    </form>
  );
}

export function WorkspaceForm({ name, description, mode }: { name: string; description: string; mode: "edit" | "create" }) {
  const router = useRouter();
  const f = useActionForm({ name, description });
  return (
    <form noValidate className="grid gap-4" onSubmit={(e) => { e.preventDefault(); f.submit(mode === "edit" ? updateWorkspace : createWorkspace, { onSuccess: () => { if (mode === "create") f.reset(); router.refresh(); } }); }}>
      <Field label="Name" required error={f.errors.name}><Input {...f.bind("name")} placeholder={mode === "create" ? "z. B. NordTech Werk Hamburg" : undefined} /></Field>
      <Field label="Beschreibung" error={f.errors.description}><Textarea {...f.bind("description")} rows={2} /></Field>
      <div><Button type="submit" size="sm" variant={mode === "edit" ? "primary" : "secondary"} loading={f.pending}>{mode === "edit" ? "Workspace speichern" : "Workspace anlegen"}</Button></div>
    </form>
  );
}
