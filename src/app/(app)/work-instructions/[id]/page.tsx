import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, FileText, History } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { db } from "@/lib/db";
import { getInstruction, getPublishedRevision } from "@/lib/services/instructions";
import { userOptions } from "@/lib/services/users";
import { assemblySelectOptions, imageOptions } from "@/lib/services/instruction-options";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { SetBreadcrumbs } from "@/components/layout/breadcrumbs";
import { InstructionEditor } from "@/components/instructions/instruction-editor";
import { InstructionWorkflow } from "@/components/instructions/instruction-workflow";
import { LinkedDocuments } from "@/components/instructions/linked-documents";
import { INSTRUCTION_STATUS, WORK_ORDER_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export default async function InstructionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const wi = await getInstruction(ctx.workspaceId, id);
  if (!wi) notFound();
  const [published, assemblies, users, images, docs] = await Promise.all([
    getPublishedRevision(id),
    assemblySelectOptions(ctx.workspaceId),
    userOptions(),
    imageOptions(ctx.workspaceId),
    db.document.findMany({ where: { workspaceId: ctx.workspaceId, workInstructionId: null }, orderBy: { number: "asc" }, select: { id: true, number: true, title: true } }),
  ]);
  const workingIsPublished = wi.status === "PUBLISHED";

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Work Instructions", href: "/work-instructions" }, { label: wi.number }, { label: "Editor" }]} />
      <PageHeader
        meta={
          <>
            <span className="font-mono text-xs text-subtle">{wi.number}</span>
            <Badge tone="neutral">Arbeitskopie v{wi.version}</Badge>
            <StatusBadge meta={INSTRUCTION_STATUS[wi.status]} />
            {published && !workingIsPublished && <Badge tone="success">gültig: v{published.version}</Badge>}
          </>
        }
        title={wi.title}
        description={`Autor: ${wi.author?.name ?? "—"}${wi.approvedBy ? ` · Freigabe: ${wi.approvedBy.name}` : ""}`}
        actions={
          <Link href={`/work-instructions/${id}/released`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            <Eye /> Freigegebene Version
          </Link>
        }
      />
      {!workingIsPublished && (
        <div className="mb-6 rounded-md border border-border bg-elevated/60 px-4 py-2.5 text-xs text-muted">
          <strong className="text-fg">Editor-Ansicht – kein gültiges Produktionsdokument.</strong>{" "}
          {published ? `In der Produktion gilt weiterhin Version ${published.version}.` : "Es existiert noch keine veröffentlichte Version."}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <InstructionEditor
            id={wi.id}
            status={wi.status}
            version={wi.version}
            assemblies={assemblies}
            users={users}
            images={images}
            initial={{
              title: wi.title,
              description: wi.description ?? "",
              assemblyId: wi.assemblyId ?? "",
              tools: wi.tools.join("\n"),
              materials: wi.materials.join("\n"),
              safetyNotes: wi.safetyNotes ?? "",
              imageUrls: wi.imageUrls.join("\n"),
              steps: wi.steps.map((s) => ({
                key: s.id,
                id: s.id,
                title: s.title,
                description: s.description,
                tools: s.tools.join(", "),
                parts: s.parts.join(", "),
                expectedResult: s.expectedResult ?? "",
                isCheckpoint: s.isCheckpoint,
                safetyCritical: s.safetyCritical,
                imageUrl: s.imageUrl ?? "",
                responsibleId: s.responsibleId ?? "",
              })),
            }}
          />
        </div>
        <aside className="space-y-6">
          <InstructionWorkflow id={wi.id} status={wi.status} version={wi.version} canApprove={ctx.canApprove} isAuthor={wi.authorId === ctx.user.id} deletable={!published && wi.workOrders.length === 0} />
          <Card>
            <CardHeader icon={<History />} title="Versionshistorie" />
            <ol className="max-h-96 divide-y divide-border overflow-y-auto">
              {wi.revisions.map((r) => (
                <li key={r.id} className="px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono">v{r.version}</span>
                    <StatusBadge meta={INSTRUCTION_STATUS[r.status]} />
                    <Link href={`/work-instructions/${id}/released?rev=${r.id}`} className="ml-auto text-primary hover:underline">ansehen</Link>
                  </div>
                  <p className="mt-1 text-muted">{r.changeNote ?? "—"}</p>
                  <p className="text-subtle">{r.createdBy?.name ?? "—"} · {formatDateTime(r.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <CardHeader icon={<FileText />} title="Dokumente & Bilder" />
            <CardContent>
              <LinkedDocuments instructionId={wi.id} linked={wi.documents} available={docs.map((d) => ({ value: d.id, label: `${d.number} · ${d.title}` }))} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Verwendet in Montageaufträgen" />
            <ul className="divide-y divide-border">
              {wi.workOrders.length === 0 && <li className="px-4 py-3 text-xs text-muted">Keine.</li>}
              {wi.workOrders.map((w) => (
                <li key={w.id}>
                  <Link href={`/assembly/work-orders/${w.id}`} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-elevated/40">
                    <span className="font-mono text-2xs text-subtle">{w.number}</span>
                    <span className="min-w-0 flex-1 truncate">{w.title}</span>
                    <StatusBadge meta={WORK_ORDER_STATUS[w.status]} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
