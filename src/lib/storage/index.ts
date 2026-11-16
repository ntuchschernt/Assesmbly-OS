import "server-only";
import path from "path";
import { randomUUID } from "crypto";
import { LocalStorageProvider } from "./local";
import { S3StorageProvider } from "./s3";
import type { StorageProvider } from "./types";

let provider: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (provider) return provider;
  const driver = process.env.STORAGE_DRIVER ?? "local";
  provider =
    driver === "s3"
      ? new S3StorageProvider()
      : new LocalStorageProvider(path.resolve(process.cwd(), process.env.STORAGE_LOCAL_DIR ?? "./storage/uploads"));
  return provider;
}

/** Builds a collision-free key: <scope>/<uuid>-<sanitized filename> */
export function storageKey(scope: string, fileName: string) {
  const clean = fileName.normalize("NFKD").replace(/[^\w.-]+/g, "_").slice(-120);
  return `${scope}/${randomUUID()}-${clean}`;
}
