import Link from "next/link";
import { FileText, Upload } from "lucide-react";
import type { DocumentStatus, DocumentType } from "@prisma/client";
import { requireContext } from "@/lib/auth/context";
import { listDocuments } from "@/lib/services/documents";
import { documentFormOptions } from "@/lib/services/document-options";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { StatusBadge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { UploadDocumentDialog } from "@/components/documents/document-dialogs";
import { DocIcon } from "@/components/documents/doc-icon";
import { DOCUMENT_STATUS, DOCUMENT_TYPE, options } from "@/lib/constants";
import { formatBytes, formatDate } from "@/lib/utils";

export const metadata = { title: "Documents" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const ctx = await requireContext();
  const [docs, opts] = await Promise.all([
    listDocuments(ctx.workspaceId, { q: sp.q, type: sp.type as DocumentType | undefined, status: sp.status as DocumentStatus | undefined, projectId: sp.project, assemblyId: sp.assembly }),
    documentFormOptions(ctx.workspaceId),
  ]);
  const byType = Object.keys(DOCUMENT_TYPE).map((t) => ({ type: t as DocumentType, count: docs.filter((d) => d.type === t).length }));
  const upload = (
    <UploadDocumentDialog
      projects={opts.projects}
      assemblies={opts.assemblies}
      initial={{ projectId: sp.project, assemblyId: sp.assembly }}
      defaultOpen={sp.upload === "1"}
      trigger={<Button><Upload /> Hochladen</Button>}
    />
  );

  return (
    <>
      <PageHeader title="Documents" description="Technische Dokumentenbibliothek mit Versionierung und Freigabestatus. Die Volltextsuche umfasst auch extrahierte Inhalte." actions={upload} />
      <div className="mb-4 flex flex-wrap gap-2">
        {byType.map((t) => (
          <Link key={t.type} href={`/documents?type=${t.type}`} className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${sp.type === t.type ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted hover:text-fg"}`}>
            <DocIcon type={t.type} className="size-3.5" /> {DOCUMENT_TYPE[t.type].label} <span className="font-mono">{t.count}</span>
          </Link>
        ))}
      </div>
      <FilterBar
        fields={[
          { type: "search", key: "q", placeholder: "Titel, Nummer, Inhalt, Tag" },
          { type: "select", key: "type", placeholder: "Alle Typen", options: options(DOCUMENT_TYPE) },
          { type: "select", key: "status", placeholder: "Aktive (ohne Archiv)", options: options(DOCUMENT_STATUS) },
          { type: "select", key: "project", placeholder: "Alle Projekte", options: opts.projects },
          { type: "select", key: "assembly", placeholder: "Alle Baugruppen", options: opts.assemblies },
        ]}
      />
      {docs.length === 0 ? (
        <EmptyState icon={<FileText />} title="Keine Dokumente gefunden" description="Passe die Filter an oder lade ein Dokument hoch." action={upload} />
      ) : (
        <Card>
          <Table>
            <THead>
              <tr>
                <TH>Dokument</TH>
                <TH>Typ</TH>
                <TH>Status</TH>
                <TH>Version</TH>
                <TH>Zuordnung</TH>
                <TH>Datei</TH>
                <TH>Verantwortlich</TH>
                <TH>Geändert</TH>
              </tr>
            </THead>
            <TBody>
              {docs.map((d) => {
                const v = d.versions[0];
                return (
                  <TR key={d.id}>
                    <TD className="min-w-72">
                      <Link href={`/documents/${d.id}`} className="group flex items-start gap-3">
                        <span className="mt-0.5 rounded border border-border bg-elevated p-1.5 text-muted group-hover:text-primary"><DocIcon type={d.type} /></span>
                        <span className="min-w-0">
                          <span className="block font-mono text-2xs text-subtle">{d.number}</span>
                          <span className="font-medium group-hover:text-primary">{d.title}</span>
                          {d.tags.length > 0 && <span className="mt-1 flex flex-wrap gap-1">{d.tags.slice(0, 3).map((t) => <Tag key={t}>{t}</Tag>)}</span>}
                        </span>
                      </Link>
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted">{DOCUMENT_TYPE[d.type].label}</TD>
                    <TD><StatusBadge meta={DOCUMENT_STATUS[d.status]} /></TD>
                    <TD className="font-mono text-xs">v{d.currentVersion}</TD>
                    <TD className="text-xs text-muted">
                      {d.project ? <Link href={`/projects/${d.project.id}`} className="hover:text-fg">{d.project.key}</Link> : "—"}
                      {d.assembly && <> · <Link href={`/assembly/assemblies/${d.assembly.id}`} className="hover:text-fg">{d.assembly.code}</Link></>}
                    </TD>
                    <TD className="max-w-48 text-xs text-muted"><span className="block truncate">{v?.fileName}</span><span className="text-subtle">{v ? formatBytes(v.size) : ""}{v && !v.storageKey ? " · nur Metadaten" : ""}</span></TD>
                    <TD className="text-xs">{d.owner?.name ?? "—"}</TD>
                    <TD className="font-mono text-xs text-muted">{formatDate(d.updatedAt)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </Card>
      )}
    </>
  );
}
