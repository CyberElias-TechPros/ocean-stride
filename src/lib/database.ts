/**
 * Legacy re-export of the application's canonical data service.
 * All database modules point to the same singleton so data written by one
 * feature is visible to every other feature.
 */
export {
  DatabaseService,
  DatabaseServiceV2,
  db,
  isRemoteEnabled,
} from './database-service';
export type { RemoteRecord } from './database-service';
