/**
 * OceanStride Worker environment bindings.
 */
export interface Env {
  DB: D1Database;
  /** File blob storage (documents, uploads, avatars). KV-backed on accounts without R2. */
  OCEAN_FILES?: KVNamespace;
  JWT_SECRET: string;
  REFRESH_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  CLIENT_URL?: string;
}