/**
 * Canonical data service for the application (previously database2).
 * It is re-exported from the unified database-service module so every
 * component shares the same IndexedDB/Cloudflare data layer.
 */
export {
  DatabaseService,
  DatabaseServiceV2,
  db,
  isRemoteEnabled,
} from './database-service';
export type { RemoteRecord } from './database-service';
