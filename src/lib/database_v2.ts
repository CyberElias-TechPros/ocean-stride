/**
 * Legacy data-service module re-exporting the canonical singleton.
 * Kept for backwards compatibility with hooks and pages that imported
 * DatabaseServiceV2 from this file.
 */
export {
  DatabaseService,
  DatabaseServiceV2,
  db,
  isRemoteEnabled,
} from './database-service';
export type { RemoteRecord } from './database-service';
