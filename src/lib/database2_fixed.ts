/**
 * Legacy re-export of the canonical data service.
 * Retained so existing imports continue to work without double data stores.
 */
export {
  DatabaseService,
  DatabaseServiceV2,
  db,
  isRemoteEnabled,
} from './database-service';
export type { RemoteRecord } from './database-service';
