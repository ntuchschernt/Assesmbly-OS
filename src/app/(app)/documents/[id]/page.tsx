import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileSearch, History, Pencil, Upload } from "lucide-react";
import { requireContext } from "@/lib/auth/context";
import { getDocument } from "@/lib/services/documents";
import { documentFormOptions } from "@/lib/services/document-options";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyValue, PageHeader } from "@/components/ui/misc";
import { SetBreadcrumbs } from "@/components/layout/breadcrumbs";
import { EditDocumentDialog, NewVersionDialog } from "@/components/documents/document-dialogs";
import { DocumentStatusActions } from "@/components/documents/document-status-actions";
import { DocIcon } from "@/components/documents/doc-icon";
import { DOCUMENT_STATUS, DOCUMENT_TYPE, QUALITY_STATUS, SEVERITY } from "@/lib/constants";
import { formatBytes, formatDate, formatDateTime } from "@/lib/utils";

const fileUrl = (key: string, inline = false) => `/api/files/${key.split("/").map(encodeURIComponent).join("/")}${inline ? "?inline=1" : ""}`;

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const [doc, opts] = await Promise.all([getDocument(ctx.workspaceId, id), documentFormOptions(ctx.workspaceId)]);
  if (!doc) notFound();
  const current = doc.versions[0];
  const preview = current?.storageKey && (current.mimeType.startsWith("image/") || current.mimeType === "application/pdf");

  return (
    <>
      <SetBreadcrumbs items={[{ label: "Documents", href: "/documents" }, { label: doc.number }]} />
      <PageHeader
        meta={
          <>
            <span className="font-mono text-xs text-subtle">{doc.number}</span>
            <StatusBadge meta={DOCUMENT_STATUS[doc.status]} />
            <Badge tone="neutral">v{doc.currentVersion}</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted"><DocIcon type={doc.type} className="size-3.5" /> {DOCUMENT_TYPE[doc.type].label}</span>
          </>
        }
        title={doc.title}
        description={doc.description ?? undefined}
        actions={
          <>
            <DocumentStatusActions id={doc.id} status={doc.status} canApprove={ctx.canApprove} />
            <EditDocumentDialog
              id={doc.id}
              projects={opts.projects}
              assemblies={opts.assemblies}
              initial={{ title: doc.title, description: doc.description ?? "", type: doc.type, category: doc.category ?? "", tags: doc.tags.join(", "), projectId: doc.projectId ?? "", assemblyId: doc.assemblyId ?? "" }}
              trigger={<Button size="sm" variant="secondary"><Pencil /> Metadaten</Button>}
            />
          </>
        }
      />
      {doc.status !== "APPROVED" && doc.status !== "ARCHIVED" && (
        <div className="mb-6 rounded-md border border-warning/40 bg-warning/10 px-4 py-2.5 text-sm text-warning">Dieses Dokument ist nicht freigegeben ({DOCUMENT_STATUS[doc.status].label}) und darf nicht als verbindliche Fertigungsunterlage verwendet werden.</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Aktuelle Datei"
              description={current ? `${current.fileName} · ${formatBytes(current.size)} · Version ${current.version}` : "Keine Datei"}
              action={current?.storageKey ? <a href={fileUrl(current.storageKey)} className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs hover:bg-elevated"><Download className="size-3.5" /> Download</a> : null}
            />
            <CardContent>
              {preview ? (
                current!.mimeType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fileUrl(current!.storageKey!, true)} alt={doc.title} className="max-h-[480px] rounded-md border border-border" />
                ) : (
                  <iframe src={fileUrl(current!.storageKey!, true)} title={doc.title} className="h-[560px] w-full rounded-md border border-border bg-white" />
                )
              ) : (
                <div className="bg-grid flex flex-col items-center justify-center rounded-md border border-dashed border-border py-10 text-center">
                  <DocIcon type={doc.type} className="size-8 text-muted" />
                  <p className="mt-2 text-sm">{current?.storageKey ? "Für dieses Format ist keine Vorschau verfügbar." : "Demo-Datensatz: nur Metadaten, keine Binärdatei hinterlegt."}</p>
                  <p className="mt-1 text-xs text-muted">Lade eine neue Version hoch, um eine Datei zu hinterlegen.</p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader icon={<FileSearch />} title="Extrahierter Inhalt" description="Grundlage für Volltextsuche und ASSEMBLY AI (Retrieval)" />
            <CardContent>
              {doc.extractedText ? (
                <p className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-md bg-bg/60 p-3 font-mono text-xs leading-relaxed text-fg/80">{doc.extractedText}</p>
              ) : (
                <p className="text-sm text-muted">Nicht verarbeitet. Textextraktion für {current?.mimeType ?? "dieses Format"} ist vorbereitet, aber im MVP nicht aktiv (siehe <code className="font-mono text-xs">lib/ai/processing.ts</code>).</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader icon={<History />} title="Versionen" action={doc.status !== "ARCHIVED" ? <NewVersionDialog documentId={doc.id} nextVersion={doc.currentVersion + 1} trigger={<Button size="sm" variant="secondary"><Upload /> Neue Version</Button>} /> : null} />
            <ol className="divide-y divide-border">
              {doc.versions.map((v) => (
                <li key={v.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="w-10 font-mono text-xs">v{v.version}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{v.changeNote ?? "—"}</span>
                    <span className="block truncate text-2xs text-subtle">{v.fileName} · {formatBytes(v.size)} · {v.uploadedBy?.name ?? "—"} · {formatDateTime(v.createdAt)}</span>
                  </span>
                  {v.version === doc.currentVersion && <Badge tone="orange">aktuell</Badge>}
                  {v.storageKey ? (
                    <a href={fileUrl(v.storageKey)} className="rounded p-1.5 text-muted hover:bg-elevated hover:text-fg" aria-label={`Version ${v.version} herunterladen`}><Download className="size-3.5" /></a>
                  ) : (
                    <span className="text-2xs text-subtle" title="Demo-Datensatz ohne Datei">Metadaten</span>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Metadaten" />
            <CardContent className="divide-y divide-border py-1">
              <KeyValue label="Kategorie">{doc.category ?? "—"}</KeyValue>
              <KeyValue label="Verantwortlich">{doc.owner?.name ?? "—"}</KeyValue>
              <KeyValue label="Projekt">{doc.project ? <Link className="hover:text-primary" href={`/projects/${doc.project.id}`}>{doc.project.key} · {doc.project.name}</Link> : "—"}</KeyValue>
              <KeyValue label="Baugruppe">{doc.assembly ? <Link className="hover:text-primary" href={`/assembly/assemblies/${doc.assembly.id}`}>{doc.assembly.code} · {doc.assembly.name}</Link> : "—"}</KeyValue>
              <KeyValue label="Montageanweisung">{doc.workInstruction ? <Link className="hover:text-primary" href={`/work-instructions/${doc.workInstruction.id}`}>{doc.workInstruction.number}</Link> : "—"}</KeyValue>
              <KeyValue label="Angelegt">{formatDate(doc.createdAt)}</KeyValue>
              <KeyValue label="Tags"><span className="flex flex-wrap justify-end gap-1">{doc.tags.length ? doc.tags.map((t) => <Tag key={t}>{t}</Tag>) : "—"}</span></KeyValue>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Qualitätsmeldungen" />
            <ul className="divide-y divide-border">
              {doc.qualityIssues.length === 0 && <li className="px-4 py-3 text-sm text-muted">Keine Verknüpfungen.</li>}
              {doc.qualityIssues.map((q) => (
                <li key={q.id}>
                  <Link href={`/quality/${q.id}`} className="block px-4 py-2.5 hover:bg-elevated/40">
                    <div className="flex items-center gap-2"><span className="font-mono text-2xs text-subtle">{q.number}</span><StatusBadge meta={SEVERITY[q.severity]} /><StatusBadge meta={QUALITY_STATUS[q.status]} /></div>
                    <div className="mt-1 truncate text-sm">{q.title}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Link href={`/copilot?q=${encodeURIComponent(`Fasse ${doc.number} zusammen`)}`} className="block rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm hover:bg-primary/10">
            <span className="font-medium text-primary">ASSEMBLY AI</span>
            <span className="block text-xs text-muted">Dokument zusammenfassen lassen (Demo-Provider, simuliert)</span>
          </Link>
        </div>
      </div>
    </>
  );
}
