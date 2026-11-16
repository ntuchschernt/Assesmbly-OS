import { requireContext } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { NotificationList } from "@/components/settings/notification-list";

export const metadata = { title: "Benachrichtigungen" };

export default async function NotificationsPage() {
  const ctx = await requireContext();
  const items = await db.notification.findMany({ where: { userId: ctx.user.id, workspaceId: ctx.workspaceId }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Benachrichtigungen" description="Zuweisungen, Fristen, Freigaben und Qualitätsmeldungen." />
      <Card>
        <NotificationList items={items.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, type: n.type, createdAt: n.createdAt.toISOString(), read: !!n.readAt }))} />
      </Card>
    </div>
  );
}
