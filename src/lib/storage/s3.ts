import type { StorageProvider } from "./types";

/**
 * Prepared S3-compatible provider (AWS S3, MinIO, Ceph …).
 * Not implemented in the MVP because no credentials/bucket exist. To implement, add
 * @aws-sdk/client-s3 and map put/get/delete to PutObject/GetObject/DeleteObject using
 * S3_BUCKET, S3_REGION, S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY.
 */
export class S3StorageProvider implements StorageProvider {
  readonly name = "s3";
  private fail(): never {
    throw new Error("S3-Storage ist vorbereitet, aber nicht konfiguriert. Setze STORAGE_DRIVER=local oder implementiere src/lib/storage/s3.ts.");
  }
  async put(): Promise<void> {
    this.fail();
  }
  async get(): Promise<Buffer | null> {
    this.fail();
  }
  async delete(): Promise<void> {
    this.fail();
  }
}
