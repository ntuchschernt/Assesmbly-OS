import { promises as fs } from "fs";
import path from "path";
import type { StorageProvider } from "./types";

/** Stores files below STORAGE_LOCAL_DIR. Keys are sanitized to prevent path traversal. */
export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  constructor(private readonly root: string) {}

  private resolve(key: string) {
    const safeKey = key.replace(/\\/g, "/").split("/").filter((p) => p && p !== "." && p !== "..").join("/");
    const full = path.resolve(this.root, safeKey);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, data: Buffer) {
    const file = this.resolve(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  }

  async get(key: string) {
    try {
      return await fs.readFile(this.resolve(key));
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}
