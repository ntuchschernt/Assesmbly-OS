"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireContext } from "@/lib/auth/context";
import { documentSchema, documentStatusSchema } from "@/lib/validation/schemas";
import { failure, safe, zodFailure, type ActionResult } from "@/lib/action-result";
import { logActivity, notify, notifyRoles } from "@/lib/services/activity";
import { nextDocumentNumber } from "@/lib/services/documents";
import { storeUpload } from "@/lib/storage/upload";
import { extractText } from "@/lib/ai/processing";
import { DOCUMENT_STATUS } from "@/lib/constants";

function formToObject(fd: FormData) {
  return {
    title: fd.get("title"),
    description: fd.get("description"),
    type: fd.get("type"),
    category: fd.get("category"),
    tags: String(fd.get("tags") ?? ""),
    projectId: fd.get("projectId"),
    assemblyId: fd.get("assemblyId"),
  };
}

async function checkLinks(workspaceId: string, projectId: string | null, assemblyId: string | null) {
  if (projectId && !(await db.project.findFirst({ where: { id: projectId, workspaceId } }))) return "Projekt ungültig";
  if (assemblyId && !(await db.assembly.findFirst({ where: { id: assemblyId, machine: { project: { workspaceId } } } }))) return "Baugruppe ungültig";
  return null;
}

export async function uploadDocument(fd: FormData): Promise<ActionResult<{ id: string }>> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = documentSchema.safeParse(formToObject(fd));
    if (!parsed.success) return zodFailure(parsed.error);
    const linkErr = await checkLinks(ctx.workspaceId, parsed.data.projectId, parsed.data.assemblyId);
    if (linkErr) return failure(linkErr);
    const stored = await storeUpload(fd.get("file"), `documents/${ctx.workspaceId}`);
    const number = await nextDocumentNumber(ctx.workspaceId);
    const doc = await db.document.create({
      data: {
        ...parsed.data,
        workspaceId: ctx.workspaceId,
        number,
        ownerId: ctx.user.id,
        extractedText: await extractText(stored.buffer, stored.mimeType),
        versions: { create: { version: 1, fileName: stored.fileName, mimeType: stored.mimeType, size: stored.size, storageKey: stored.storageKey, changeNote: "Erstausgabe", uploadedById: ctx.user.id } },
      },
    });
    await logActivity(ctx, { entityType: "document", entityId: doc.id, action: "created", summary: `hat ${number} „${doc.title}“ hochgeladen`, link: `/documents/${doc.id}` });
    revalidatePath("/", "layout");
    return { ok: true, data: { id: doc.id }, message: `${number} hochgeladen` };
  });
}

export async function uploadDocumentVersion(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const doc = await db.document.findFirst({ where: { id: String(fd.get("documentId") ?? ""), workspaceId: ctx.workspaceId } });
    if (!doc) return failure("Dokument nicht gefunden.");
    if (doc.status === "ARCHIVED") return failure("Archivierte Dokumente können nicht revidiert werden.");
    const note = String(fd.get("changeNote") ?? "").trim();
    if (!note) return { ok: false, error: "Bitte die Änderung beschreiben.", fieldErrors: { changeNote: "Änderungsbeschreibung erforderlich" } };
    const stored = await storeUpload(fd.get("file"), `documents/${ctx.workspaceId}`);
    const version = doc.currentVersion + 1;
    await db.$transaction([
      db.documentVersion.create({ data: { documentId: doc.id, version, fileName: stored.fileName, mimeType: stored.mimeType, size: stored.size, storageKey: stored.storageKey, changeNote: note.slice(0, 500), uploadedById: ctx.user.id } }),
      // A new revision invalidates a previous approval.
      db.document.update({ where: { id: doc.id }, data: { currentVersion: version, status: "DRAFT", extractedText: (await extractText(stored.buffer, stored.mimeType)) ?? doc.extractedText } }),
    ]);
    await logActivity(ctx, { entityType: "document", entityId: doc.id, action: "version", summary: `hat ${doc.number} Version ${version} hochgeladen`, link: `/documents/${doc.id}` });
    revalidatePath("/", "layout");
    return { ok: true, message: `Version ${version} hochgeladen – Status zurück auf Draft` };
  });
}

export async function updateDocument(id: string, input: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const parsed = documentSchema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    const doc = await db.document.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!doc) return failure("Dokument nicht gefunden.");
    const linkErr = await checkLinks(ctx.workspaceId, parsed.data.projectId, parsed.data.assemblyId);
    if (linkErr) return failure(linkErr);
    await db.document.update({ where: { id }, data: parsed.data });
    revalidatePath("/", "layout");
    return { ok: true, message: "Metadaten gespeichert" };
  });
}

export async function setDocumentStatus(id: string, status: unknown): Promise<ActionResult> {
  return safe(async () => {
    const ctx = await requireContext();
    const s = documentStatusSchema.safeParse(status);
    if (!s.success) return failure("Ungültiger Status.");
    const doc = await db.document.findFirst({ where: { id, workspaceId: ctx.workspaceId } });
    if (!doc) return failure("Dokument nicht gefunden.");
    if (s.data === "APPROVED" && !ctx.canApprove) return failure("Keine Berechtigung zur Freigabe von Dokumenten.");
    if (s.data === "APPROVED" && doc.status !== "REVIEW") return failure("Nur Dokumente im Status Review können freigegeben werden.");
    await db.document.update({ where: { id }, data: { status: s.data } });
    const link = `/documents/${id}`;
    if (s.data === "REVIEW") await notifyRoles(ctx, ["QUALITY", "PROJECT_MANAGER"], { type: "DOCUMENT_REVIEW", title: "Dokument zur Freigabe eingereicht", body: `${doc.number} ${doc.title}`, link });
    if (s.data === "APPROVED") await notify(ctx, doc.ownerId, { type: "DOCUMENT_REVIEW", title: `${doc.number} freigegeben`, body: doc.title, link });
    await logActivity(ctx, { entityType: "document", entityId: id, action: "status", summary: `hat ${doc.number} auf „${DOCUMENT_STATUS[s.data].label}“ gesetzt`, link });
    revalidatePath("/", "layout");
    return { ok: true, message: `${doc.number}: ${DOCUMENT_STATUS[s.data].label}` };
  });
}
