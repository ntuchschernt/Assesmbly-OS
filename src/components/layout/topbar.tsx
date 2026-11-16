"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Building2, Check, ChevronsUpDown, LogOut, Menu, Settings, User } from "lucide-react";
import { Breadcrumbs } from "./breadcrumbs";
import { CommandSearch } from "./command-search";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/misc";
import { logout, switchWorkspace } from "@/actions/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";
import { relativeTime } from "@/lib/utils";
import type { ShellProps } from "./app-shell";

export type ShellNotification = { id: string; title: string; body: string | null; link: string | null; createdAt: string; read: boolean };

export function Topbar({ user, workspace, workspaces, notifications, unreadCount, onMenu }: Omit<ShellProps, "children"> & { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button onClick={onMenu} className="-ml-1 rounded p-1.5 text-muted hover:bg-elevated hover:text-fg lg:hidden cursor-pointer" aria-label="Menü öffnen">
        <Menu className="size-5" />
      </button>
      <div className="min-w-0 flex-1">
        <Breadcrumbs workspaceName={workspace.name} />
      </div>
      <CommandSearch />
      <WorkspaceSwitcher workspace={workspace} workspaces={workspaces} />
      <NotificationMenu notifications={notifications} unreadCount={unreadCount} />
      <UserMenu user={user} />
    </header>
  );
}

function WorkspaceSwitcher({ workspace, workspaces }: { workspace: { id: string; name: string }; workspaces: { id: string; name: string }[] }) {
  const [pending, start] = useTransition();
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button className="hidden h-8 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-xs text-fg hover:border-border-strong md:flex cursor-pointer" disabled={pending}>
          <Building2 className="size-3.5 text-primary" />
          <span className="max-w-40 truncate">{workspace.name}</span>
          <ChevronsUpDown className="size-3 text-muted" />
        </button>
      </DropdownTrigger>
      <DropdownContent className="w-72">
        <DropdownLabel>Workspace wechseln</DropdownLabel>
        {workspaces.map((w) => (
          <DropdownItem
            key={w.id}
            onSelect={() =>
              w.id !== workspace.id &&
              start(async () => {
                const res = await switchWorkspace(w.id);
                if (res && !res.ok) toast.error(res.error);
              })
            }
          >
            <Building2 />
            <span className="flex-1 truncate">{w.name}</span>
            {w.id === workspace.id && <Check className="!text-primary" />}
          </DropdownItem>
        ))}
      </DropdownContent>
    </Dropdown>
  );
}

function NotificationMenu({ notifications, unreadCount }: { notifications: ShellNotification[]; unreadCount: number }) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button className="relative rounded-md p-2 text-muted hover:bg-elevated hover:text-fg cursor-pointer" aria-label={`Benachrichtigungen (${unreadCount} ungelesen)`}>
          <Bell className="size-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-bg">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownTrigger>
      <DropdownContent className="w-[22rem] max-w-[calc(100vw-1rem)] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-sm font-semibold">Benachrichtigungen</span>
          {unreadCount > 0 && (
            <button
              className="text-xs text-primary hover:text-primary-hover cursor-pointer"
              onClick={() =>
                start(async () => {
                  const res = await markAllNotificationsRead();
                  if (res.ok) toast.success(res.message);
                })
              }
            >
              Alle als gelesen markieren
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto p-1">
          {notifications.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted">Keine Benachrichtigungen</p>}
          {notifications.map((n) => (
            <DropdownItem
              key={n.id}
              className="items-start gap-3 py-2"
              onSelect={() =>
                start(async () => {
                  if (!n.read) await markNotificationRead(n.id);
                  if (n.link) router.push(n.link);
                })
              }
            >
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${n.read ? "text-muted" : "text-fg"}`}>{n.title}</span>
                {n.body && <span className="block truncate text-xs text-subtle">{n.body}</span>}
                <span className="mt-0.5 block text-2xs text-subtle">{relativeTime(n.createdAt)}</span>
              </span>
            </DropdownItem>
          ))}
        </div>
        <div className="border-t border-border p-1">
          <DropdownItem onSelect={() => router.push("/notifications")} className="justify-center text-xs text-muted">
            Alle Benachrichtigungen anzeigen
          </DropdownItem>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}

function UserMenu({ user }: { user: ShellProps["user"] }) {
  const [, start] = useTransition();
  return (
    <Dropdown>
      <DropdownTrigger asChild>
        <button className="flex items-center gap-2 rounded-md p-1 hover:bg-elevated cursor-pointer" aria-label="Benutzermenü">
          <Avatar name={user.name} size="md" />
        </button>
      </DropdownTrigger>
      <DropdownContent className="w-60">
        <div className="px-2 py-2">
          <div className="text-sm font-medium">{user.name}</div>
          <div className="truncate text-xs text-muted">{user.email}</div>
          <div className="mt-1 text-2xs text-subtle">{user.title ?? user.roleLabel}</div>
        </div>
        <DropdownSeparator />
        <DropdownItem asChild>
          <Link href="/settings">
            <User /> Profil
          </Link>
        </DropdownItem>
        <DropdownItem asChild>
          <Link href="/settings#workspace">
            <Settings /> Einstellungen
          </Link>
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem danger onSelect={() => start(() => logout())}>
          <LogOut /> Abmelden
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}
