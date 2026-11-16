"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/ui/use-action-form";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";
import { formatDateTime, relativeTime } from "@/lib/utils";

type N = { id: string; title: string; body: string | null; link: string | null; createdAt: string; read: boolean; type: string };

export function NotificationList({ items }: { items: N[] }) {
  const router = useRouter();
  const { pending, run } = useAction();
  const unread = items.filter((n) => !n.read).length;
  return (
    <div>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="text-sm text-muted">{unread} ungelesen · {items.length} gesamt</span>
        <Button size="sm" variant="secondary" disabled={!unread} loading={pending} onClick={() => run(() => markAllNotificationsRead(), { onSuccess: () => router.refresh() })}><CheckCheck /> Alle als gelesen</Button>
      </div>
      <ul className="divide-y divide-border">
        {items.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">Keine Benachrichtigungen.</li>}
        {items.map((n) => (
          <li key={n.id}>
            <button
              className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-elevated/40 cursor-pointer"
              onClick={() => run(async () => { if (!n.read) await markNotificationRead(n.id); if (n.link) router.push(n.link); else router.refresh(); return { ok: true }; }, { success: "" })}
            >
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-border-strong" : "bg-primary"}`} />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm ${n.read ? "text-muted" : "font-medium"}`}>{n.title}</span>
                {n.body && <span className="block text-xs text-subtle">{n.body}</span>}
              </span>
              <span className="shrink-0 text-2xs text-subtle" title={formatDateTime(n.createdAt)}>{relativeTime(n.createdAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
