/** Abstract binary storage. Implementations: local filesystem (default), S3 (prepared). */
export interface StorageProvider {
  readonly name: string;
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}
