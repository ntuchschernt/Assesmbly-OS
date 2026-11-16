import { Bot, Database, HardDrive, ShieldCheck } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { listUsers } from "@/lib/services/users";
import { aiConfig } from "@/lib/ai";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, KeyValue, PageHeader } from "@/components/ui/misc";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { PasswordForm, ProfileForm, WorkspaceForm } from "@/components/settings/settings-forms";
import { APPROVER_ROLES, USER_ROLE } from "@/lib/constants";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await requireContext();
  const users = await listUsers();
  const ai = aiConfig();
  const canManage = ctx.user.role === "ADMIN" || ctx.user.role === "PROJECT_MANAGER";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Settings" description="Profil, Workspace, Benutzer und Integrationen." />
      <Card id="profile">
        <CardHeader title="Profil" description={`${ctx.user.email} · ${USER_ROLE[ctx.user.role].label}`} />
        <CardContent className="space-y-6">
          <ProfileForm name={ctx.user.name} title={ctx.user.title ?? ""} />
          <div className="border-t border-border pt-5"><PasswordForm /></div>
        </CardContent>
      </Card>

      <Card id="workspace">
        <CardHeader title="Workspace" description={`Aktiv: ${ctx.workspace.name}`} />
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="label-caps mb-3">Aktiven Workspace bearbeiten</h3>
            {canManage ? <WorkspaceForm mode="edit" name={ctx.workspace.name} description={ctx.workspace.description ?? ""} /> : <p className="text-sm text-muted">Nur Administratoren und Projektleitung können den Workspace ändern.</p>}
          </div>
          <div>
            <h3 className="label-caps mb-3">Neuen Workspace anlegen</h3>
            {canManage ? <WorkspaceForm mode="create" name="" description="" /> : <p className="text-sm text-muted">Keine Berechtigung.</p>}
            <p className="mt-3 text-xs text-subtle">Wechsel zwischen Workspaces über die Auswahl in der oberen Navigation. Vorhanden: {ctx.workspaces.map((w) => w.name).join(", ")}.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Benutzer & Rollen" description="Freigaberechte (Montageanweisungen, Dokumente) haben: Administrator, Projektleitung, Engineering, Qualität." />
        <Table>
          <THead><tr><TH>Benutzer</TH><TH>E-Mail</TH><TH>Rolle</TH><TH>Freigaberecht</TH></tr></THead>
          <TBody>
            {users.map((u) => (
              <TR key={u.id}>
                <TD><span className="flex items-center gap-2"><Avatar name={u.name} size="sm" /><span><span className="block text-sm">{u.name}</span><span className="block text-xs text-subtle">{u.title}</span></span></span></TD>
                <TD className="text-xs text-muted">{u.email}</TD>
                <TD className="text-xs">{USER_ROLE[u.role].label}</TD>
                <TD>{APPROVER_ROLES.includes(u.role) ? <Badge tone="success">Ja</Badge> : <Badge tone="muted">Nein</Badge>}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="Integrationen & System" />
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-md border border-border p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><Bot className="size-4 text-primary" /> KI-Provider</div>
            <div className="mt-2 divide-y divide-border text-sm">
              <KeyValue label="Aktiv">{ai.active === "anthropic" ? <Badge tone="success">Anthropic</Badge> : <Badge tone="warning">Demo (simuliert)</Badge>}</KeyValue>
              <KeyValue label="Modell">{ai.active === "anthropic" ? <span className="font-mono text-xs">{ai.model}</span> : "—"}</KeyValue>
              <KeyValue label="API-Schlüssel">{ai.hasKey ? "hinterlegt" : "nicht gesetzt"}</KeyValue>
            </div>
            <p className="mt-2 text-xs text-subtle">Aktivierung über <code className="font-mono">AI_PROVIDER=anthropic</code> und <code className="font-mono">ANTHROPIC_API_KEY</code> in der .env.</p>
          </div>
          <div className="rounded-md border border-border p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><HardDrive className="size-4 text-primary" /> Dokumentenspeicher</div>
            <div className="mt-2 divide-y divide-border text-sm">
              <KeyValue label="Treiber">{process.env.STORAGE_DRIVER ?? "local"}</KeyValue>
              <KeyValue label="S3">vorbereitet</KeyValue>
            </div>
          </div>
          <div className="rounded-md border border-border p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><Database className="size-4 text-primary" /> Datenbank</div>
            <div className="mt-2 divide-y divide-border text-sm">
              <KeyValue label="System">PostgreSQL · Prisma</KeyValue>
              <KeyValue label="Demo-Reset"><code className="font-mono text-xs">npm run db:reset</code></KeyValue>
            </div>
          </div>
        </CardContent>
      </Card>
      <p className="flex items-center gap-1.5 text-xs text-subtle"><ShieldCheck className="size-3.5" /> Sitzungen sind signierte HttpOnly-Cookies (12 h). Passwörter werden mit bcrypt gespeichert.</p>
    </div>
  );
}
