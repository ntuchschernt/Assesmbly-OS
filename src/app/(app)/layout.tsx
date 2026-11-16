import { AppShell } from "@/components/layout/app-shell";
import { requireContext } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { USER_ROLE, QUALITY_OPEN_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const [notifications, unreadCount, openTaskCount, openQualityCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: ctx.user.id, workspaceId: ctx.workspaceId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    db.notification.count({ where: { userId: ctx.user.id, workspaceId: ctx.workspaceId, readAt: null } }),
    db.task.count({ where: { workspaceId: ctx.workspaceId, assigneeId: ctx.user.id, status: { not: "DONE" } } }),
    db.qualityIssue.count({ where: { workspaceId: ctx.workspaceId, status: { in: QUALITY_OPEN_STATUSES } } }),
  ]);

  return (
    <AppShell
      user={{ name: ctx.user.name, email: ctx.user.email, title: ctx.user.title, roleLabel: USER_ROLE[ctx.user.role].label }}
      workspace={{ id: ctx.workspace.id, name: ctx.workspace.name }}
      workspaces={ctx.workspaces.map((w) => ({ id: w.id, name: w.name }))}
      notifications={notifications.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, createdAt: n.createdAt.toISOString(), read: !!n.readAt }))}
      unreadCount={unreadCount}
      openTaskCount={openTaskCount}
      openQualityCount={openQualityCount}
    >
      {children}
    </AppShell>
  );
}
