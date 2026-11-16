import "server-only";
import { ALLOWED_MIME_PREFIXES, MAX_UPLOAD_BYTES } from "@/lib/validation/schemas";
import { DomainError } from "@/lib/action-result";
import { getStorage, storageKey } from "./index";

/** Validates and stores an uploaded File. Returns metadata for the DB record. */
export async function storeUpload(file: unknown, scope: string) {
  if (!(file instanceof File) || file.size === 0) throw new DomainError("Bitte eine Datei auswählen.");
  if (file.size > MAX_UPLOAD_BYTES) throw new DomainError(`Datei ist zu groß (max. ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`);
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME_PREFIXES.some((p) => mimeType.startsWith(p))) throw new DomainError(`Dateityp ${mimeType} wird nicht unterstützt.`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const key = storageKey(scope, file.name);
  await getStorage().put(key, buffer, mimeType);
  return { storageKey: key, fileName: file.name.slice(0, 200), mimeType, size: file.size, buffer };
}
