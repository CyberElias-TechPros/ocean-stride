import { v4 as uuidv4 } from 'uuid';
import {
  type BaseEntity,
  type Company,
  type Vessel,
  type Seafarer,
  type CrewAssignment,
} from './schemas_v2';

import {
  STORE_NAMES,
  INDEX_NAMES,
  type CrewChange,
  type Payroll,
  type Document,
  type Notification,
  type Applicant,
  type JobPosting,
  type SystemSettings,
} from './schemas';

class DatabaseService {
  private static instance: DatabaseService;
  private db: IDBDatabase | null = null;
  // Use a new DB name to avoid clobbering the legacy schema during migration
  private dbName = 'OceanStrideDB_v2';
  private version = 4;

  private constructor() {
    // Add event listeners for version conflicts
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.name === 'VersionError') {
        console.warn('Caught unhandled VersionError, attempting to recover...');
        event.preventDefault();
        this.handleVersionConflict().catch(console.error);
      }
    });
  }

  private async handleVersionConflict(): Promise<void> {
    // Close the current database connection if it exists
    if (this.db) {
      this.db.close();
      this.db = null;
    }

    // Delete the existing database
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(this.dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => {
        console.warn('Database is blocked, cannot delete');
        resolve(); // Resolve anyway to avoid hanging
      };
    }).catch(console.error);
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  isInitialized(): boolean {
    return this.db !== null;
  }

  private async clearOldDatabases(): Promise<void> {
    // List of old database names to clean up
    const oldDbNames = ['OceanStrideDB', 'OceanStrideDB_v1'];
    
    for (const dbName of oldDbNames) {
      try {
        const req = indexedDB.deleteDatabase(dbName);
        await new Promise<void>((resolve, reject) => {
          req.onsuccess = () => {
            console.log(`Successfully deleted old database: ${dbName}`);
            resolve();
          };
          req.onerror = () => {
            console.warn(`Failed to delete old database ${dbName}:`, req.error);
            resolve(); // Don't reject, as this is not critical
          };
          req.onblocked = () => {
            console.warn(`Database ${dbName} is blocked and cannot be deleted`);
            resolve(); // Don't reject, as this is not critical
          };
        });
      } catch (error) {
        console.warn(`Error deleting database ${dbName}:`, error);
        // Continue with other databases even if one fails
      }
    }
  }

  async init(): Promise<void> {
    if (this.db) return;

    try {
      // First, clean up any old databases
      await this.clearOldDatabases();
    } catch (error) {
      console.warn('Error during database cleanup:', error);
      // Continue with initialization even if cleanup fails
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = (event) => {
        console.error('Database error:', request.error);
        // If the error is due to version conflict, try to delete and recreate the database
        if (request.error?.name === 'VersionError') {
          console.warn('Version conflict detected, attempting to recreate database...');
          this.handleVersionConflict()
            .then(() => {
              // After handling the conflict, try to initialize again
              this.init().then(resolve).catch(reject);
            })
            .catch(reject);
          return;
        }
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = (event.target as IDBOpenDBRequest).transaction!;
        this.createStores(db, tx);
      };
    });
  }

  private createStores(db: IDBDatabase, tx: IDBTransaction) {
    console.log('Database upgrade: creating stores. Current stores:', Array.from(db.objectStoreNames));

    {
      // Companies store
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAMES.COMPANIES)) {
        console.log('Creating companies store');
        store = db.createObjectStore(STORE_NAMES.COMPANIES, { keyPath: 'id' });
      } else {
        console.log('Companies store already exists');
        store = tx.objectStore(STORE_NAMES.COMPANIES);
      }
      console.log('Creating index:', INDEX_NAMES.COMPANY_BY_NAME);
      if (!store.indexNames.contains(INDEX_NAMES.COMPANY_BY_NAME)) {
        store.createIndex(INDEX_NAMES.COMPANY_BY_NAME, 'name', { unique: true });
      }
      // Optional: support finding by code if present in the schema
      console.log('Creating index: by_code');
      if (!store.indexNames.contains('by_code')) {
        store.createIndex('by_code', 'code', { unique: false });
      }
    }

    {
      // Vessels store
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAMES.VESSELS)) {
        console.log('Creating vessels store');
        store = db.createObjectStore(STORE_NAMES.VESSELS, { keyPath: 'id' });
      } else {
        console.log('Vessels store already exists');
        store = tx.objectStore(STORE_NAMES.VESSELS);
      }
      console.log('Creating index:', INDEX_NAMES.VESSEL_BY_NAME);
      if (!store.indexNames.contains(INDEX_NAMES.VESSEL_BY_NAME)) {
        store.createIndex(INDEX_NAMES.VESSEL_BY_NAME, 'name', { unique: false });
      }
      console.log('Creating index:', INDEX_NAMES.VESSEL_BY_IMO);
      if (!store.indexNames.contains(INDEX_NAMES.VESSEL_BY_IMO)) {
        store.createIndex(INDEX_NAMES.VESSEL_BY_IMO, 'imoNumber', { unique: true });
      }
      console.log('Creating index:', INDEX_NAMES.VESSEL_BY_STATUS);
      if (!store.indexNames.contains(INDEX_NAMES.VESSEL_BY_STATUS)) {
        store.createIndex(INDEX_NAMES.VESSEL_BY_STATUS, 'status', { unique: false });
      }
      console.log('Creating index:', INDEX_NAMES.VESSEL_BY_COMPANY);
      if (!store.indexNames.contains(INDEX_NAMES.VESSEL_BY_COMPANY)) {
        store.createIndex(INDEX_NAMES.VESSEL_BY_COMPANY, 'companyId', { unique: false });
      }
    }

    {
      // Seafarers store
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAMES.SEAFARERS)) {
        store = db.createObjectStore(STORE_NAMES.SEAFARERS, { keyPath: 'id' });
      } else {
        store = tx.objectStore(STORE_NAMES.SEAFARERS);
      }
      if (!store.indexNames.contains(INDEX_NAMES.SEAFARER_BY_NAME)) {
        store.createIndex(INDEX_NAMES.SEAFARER_BY_NAME, ['personalInfo.lastName', 'personalInfo.firstName'], { unique: false });
      }
      if (!store.indexNames.contains(INDEX_NAMES.SEAFARER_BY_RANK)) {
        store.createIndex(INDEX_NAMES.SEAFARER_BY_RANK, 'employment.rank', { unique: false });
      }
      if (!store.indexNames.contains(INDEX_NAMES.SEAFARER_BY_STATUS)) {
        store.createIndex(INDEX_NAMES.SEAFARER_BY_STATUS, 'employment.status', { unique: false });
      }
      if (!store.indexNames.contains(INDEX_NAMES.SEAFARER_BY_VESSEL)) {
        store.createIndex(INDEX_NAMES.SEAFARER_BY_VESSEL, 'employment.currentVesselId', { unique: false });
      }
      if (!store.indexNames.contains(INDEX_NAMES.SEAFARER_BY_COMPANY)) {
        store.createIndex(INDEX_NAMES.SEAFARER_BY_COMPANY, 'companyId', { unique: false });
      }
    }

    {
      // Crew Assignments store (renamed from crew_changes)
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAMES.CREW_ASSIGNMENTS)) {
        console.log('Creating crew_assignments store');
        store = db.createObjectStore(STORE_NAMES.CREW_ASSIGNMENTS, { keyPath: 'id' });
      } else {
        console.log('Crew assignments store already exists');
        store = tx.objectStore(STORE_NAMES.CREW_ASSIGNMENTS);
      }
      console.log('Creating index:', INDEX_NAMES.CREW_ASSIGNMENT_BY_SEAFARER);
      if (!store.indexNames.contains(INDEX_NAMES.CREW_ASSIGNMENT_BY_SEAFARER)) {
        store.createIndex(INDEX_NAMES.CREW_ASSIGNMENT_BY_SEAFARER, 'seafarerId', { unique: false });
      }
      console.log('Creating index:', INDEX_NAMES.CREW_ASSIGNMENT_BY_VESSEL);
      if (!store.indexNames.contains(INDEX_NAMES.CREW_ASSIGNMENT_BY_VESSEL)) {
        store.createIndex(INDEX_NAMES.CREW_ASSIGNMENT_BY_VESSEL, 'vesselId', { unique: false });
      }
      console.log('Creating index:', INDEX_NAMES.CREW_ASSIGNMENT_BY_STATUS);
      if (!store.indexNames.contains(INDEX_NAMES.CREW_ASSIGNMENT_BY_STATUS)) {
        store.createIndex(INDEX_NAMES.CREW_ASSIGNMENT_BY_STATUS, 'status', { unique: false });
      }
      console.log('Creating index:', INDEX_NAMES.CREW_ASSIGNMENT_BY_DATE_RANGE);
      if (!store.indexNames.contains(INDEX_NAMES.CREW_ASSIGNMENT_BY_DATE_RANGE)) {
        store.createIndex(INDEX_NAMES.CREW_ASSIGNMENT_BY_DATE_RANGE, ['startDate', 'endDate'], { unique: false });
      }
    }

    {
      // Payrolls store
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAMES.PAYROLLS)) {
        store = db.createObjectStore(STORE_NAMES.PAYROLLS, { keyPath: 'id' });
      } else {
        store = tx.objectStore(STORE_NAMES.PAYROLLS);
      }
      if (!store.indexNames.contains(INDEX_NAMES.PAYROLL_BY_SEAFARER)) {
        store.createIndex(INDEX_NAMES.PAYROLL_BY_SEAFARER, 'seafarerId', { unique: false });
      }
      if (!store.indexNames.contains(INDEX_NAMES.PAYROLL_BY_VESSEL)) {
        store.createIndex(INDEX_NAMES.PAYROLL_BY_VESSEL, 'vesselId', { unique: false });
      }
      if (!store.indexNames.contains(INDEX_NAMES.PAYROLL_BY_PERIOD)) {
        store.createIndex(INDEX_NAMES.PAYROLL_BY_PERIOD, ['periodStart', 'periodEnd'], { unique: false });
      }
      if (!store.indexNames.contains(INDEX_NAMES.PAYROLL_BY_STATUS)) {
        store.createIndex(INDEX_NAMES.PAYROLL_BY_STATUS, 'status', { unique: false });
      }
    }

    // Documents store
    if (!db.objectStoreNames.contains(STORE_NAMES.DOCUMENTS)) {
      const store = db.createObjectStore(STORE_NAMES.DOCUMENTS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.DOCUMENT_BY_TYPE, 'type', { unique: false });
      store.createIndex(INDEX_NAMES.DOCUMENT_BY_ENTITY, ['relatedTo.entityType', 'relatedTo.entityId'], { unique: false });
      store.createIndex(INDEX_NAMES.DOCUMENT_BY_EXPIRY, 'expiryDate', { unique: false });
    }

    // Notifications store
    if (!db.objectStoreNames.contains(STORE_NAMES.NOTIFICATIONS)) {
      const store = db.createObjectStore(STORE_NAMES.NOTIFICATIONS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.NOTIFICATION_BY_READ_STATUS, 'read', { unique: false });
      store.createIndex(INDEX_NAMES.NOTIFICATION_BY_DATE, 'createdAt', { unique: false });
      store.createIndex(INDEX_NAMES.NOTIFICATION_BY_TYPE, 'type', { unique: false });
    }

    // Applicants store
    if (!db.objectStoreNames.contains(STORE_NAMES.APPLICANTS)) {
      const store = db.createObjectStore(STORE_NAMES.APPLICANTS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.APPLICANT_BY_COMPANY, 'companyId', { unique: false });
      store.createIndex(INDEX_NAMES.APPLICANT_BY_STATUS, 'application.status', { unique: false });
      store.createIndex(INDEX_NAMES.APPLICANT_BY_POSITION, 'application.position', { unique: false });
    }

    {
      // Certificates store
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAMES.CERTIFICATES)) {
        store = db.createObjectStore(STORE_NAMES.CERTIFICATES, { keyPath: 'id' });
      } else {
        store = tx.objectStore(STORE_NAMES.CERTIFICATES);
      }
      if (!store.indexNames.contains(INDEX_NAMES.CERTIFICATE_BY_SEAFARER)) {
        store.createIndex(INDEX_NAMES.CERTIFICATE_BY_SEAFARER, 'seafarerId', { unique: false });
      }
      if (!store.indexNames.contains(INDEX_NAMES.CERTIFICATE_BY_TYPE)) {
        store.createIndex(INDEX_NAMES.CERTIFICATE_BY_TYPE, 'type', { unique: false });
      }
      if (!store.indexNames.contains(INDEX_NAMES.CERTIFICATE_BY_STATUS)) {
        store.createIndex(INDEX_NAMES.CERTIFICATE_BY_STATUS, 'status', { unique: false });
      }
      if (!store.indexNames.contains(INDEX_NAMES.CERTIFICATE_BY_EXPIRY)) {
        store.createIndex(INDEX_NAMES.CERTIFICATE_BY_EXPIRY, 'expiryDate', { unique: false });
      }
    }

    // Ranks store
    if (!db.objectStoreNames.contains(STORE_NAMES.RANKS)) {
      const store = db.createObjectStore(STORE_NAMES.RANKS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.RANK_BY_COMPANY, 'companyId', { unique: false });
      store.createIndex(INDEX_NAMES.RANK_BY_DEPARTMENT, 'department', { unique: false });
    }

    // Payroll Settings store
    if (!db.objectStoreNames.contains(STORE_NAMES.PAYROLL_SETTINGS)) {
      const store = db.createObjectStore(STORE_NAMES.PAYROLL_SETTINGS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.PAYROLL_SETTINGS_BY_COMPANY, 'companyId', { unique: true });
    }

    // Company Settings store
    if (!db.objectStoreNames.contains(STORE_NAMES.COMPANY_SETTINGS)) {
      const store = db.createObjectStore(STORE_NAMES.COMPANY_SETTINGS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.COMPANY_SETTINGS_BY_COMPANY, 'companyId', { unique: true });
    }

    // Job Postings store
    if (!db.objectStoreNames.contains(STORE_NAMES.JOB_POSTINGS)) {
      const store = db.createObjectStore(STORE_NAMES.JOB_POSTINGS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.JOB_POSTING_BY_COMPANY, 'companyId', { unique: false });
      store.createIndex(INDEX_NAMES.JOB_POSTING_BY_STATUS, 'status', { unique: false });
    }

    // System Settings store
    if (!db.objectStoreNames.contains(STORE_NAMES.SYSTEM_SETTINGS)) {
      const store = db.createObjectStore(STORE_NAMES.SYSTEM_SETTINGS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.SYSTEM_SETTINGS_BY_COMPANY, 'companyId', { unique: true });
    }
  }

  // Generic CRUD Operations
  private async withTransaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    callback: (tx: IDBTransaction) => Promise<T> | T
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized. Call init() first.');
    }

    const tx = this.db.transaction(storeNames, mode);
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {};
      tx.onerror = () => reject(tx.error);
      
      try {
        const result = callback(tx);
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  private async addTimestamps<T extends BaseEntity>(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const now = new Date().toISOString();
    return {
      ...entity,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    } as T;
  }

  // Create
  async create<T extends BaseEntity>(
    storeName: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    return this.withTransaction(storeName, 'readwrite', async (tx) => {
      const store = tx.objectStore(storeName);
      const entity = await this.addTimestamps<T>(data);

      return new Promise((resolve, reject) => {
        const request = store.add(entity);
        request.onsuccess = () => resolve(entity);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Alias for create
  async add<T extends BaseEntity>(
    storeName: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    return this.create<T>(storeName, data);
  }

  /**
   * Get an entity by its ID with proper type safety
   * @param storeName - The name of the object store
   * @param id - The ID of the entity to retrieve
   * @returns A promise that resolves to the entity or null if not found
   */
  async getById<T extends BaseEntity>(storeName: string, id: string): Promise<T | null> {
    if (!id) {
      console.warn(`Attempted to get ${storeName} with empty ID`);
      return null;
    }

    try {
      return await this.withTransaction<T | null>(storeName, 'readonly', (tx) => {
        const store = tx.objectStore(storeName);
        
        return new Promise((resolve, reject) => {
          const request = store.get(id);
          
          request.onsuccess = () => {
            const result = request.result;
            if (!result) {
              resolve(null);
              return;
            }
            
            // Ensure we have a valid ID and timestamps
            const entity = {
              ...result,
              id: result.id || id,
              createdAt: result.createdAt || new Date().toISOString(),
              updatedAt: result.updatedAt || new Date().toISOString(),
              companyId: result.companyId || '' // Ensure companyId exists for type safety
            } as T;
            
            resolve(entity);
          };
          
          request.onerror = () => {
            console.error(`Error getting ${storeName} with id ${id}:`, request.error);
            reject(request.error);
          };
        });
      });
    } catch (error) {
      console.error(`Failed to get ${storeName} with id ${id}:`, error);
      return null;
    }
  }

  async getAll<T extends BaseEntity>(storeName: string): Promise<T[]> {
    return this.withTransaction(storeName, 'readonly', (tx) => {
      const store = tx.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getByIndex<T extends BaseEntity>(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<T[]> {
    return this.withTransaction(storeName, 'readonly', (tx) => {
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      
      return new Promise((resolve, reject) => {
        const request = index.getAll(value);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Update
  async update<T extends BaseEntity>(
    storeName: string,
    id: string,
    updates: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<T> {
    return this.withTransaction(storeName, 'readwrite', async (tx) => {
      const store = tx.objectStore(storeName);
      
      // Get the existing entity
      const existing = await new Promise<T>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!existing) {
        throw new Error(`${storeName} with id ${id} not found`);
      }

      // Update the entity
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Save the updated entity
      return new Promise((resolve, reject) => {
        const request = store.put(updated);
        request.onsuccess = () => resolve(updated);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Delete
  async delete(storeName: string, id: string): Promise<void> {
    return this.withTransaction(storeName, 'readwrite', (tx) => {
      const store = tx.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Type-safe methods for each entity type
  // Company methods
  async createCompany(data: Omit<Company, keyof BaseEntity>): Promise<Company> {
    return this.create<Company>(STORE_NAMES.COMPANIES, data);
  }

  async getCompany(id: string): Promise<Company | null> {
    return this.getById<Company>(STORE_NAMES.COMPANIES, id);
  }

  async updateCompany(id: string, updates: Partial<Omit<Company, keyof BaseEntity>>): Promise<Company> {
    return this.update<Company>(STORE_NAMES.COMPANIES, id, updates);
  }

  async deleteCompany(id: string): Promise<void> {
    return this.delete(STORE_NAMES.COMPANIES, id);
  }

  // Vessel methods
  async createVessel(data: Omit<Vessel, keyof BaseEntity>): Promise<Vessel> {
    return this.create<Vessel>(STORE_NAMES.VESSELS, data);
  }

  async getVessel(id: string): Promise<Vessel | null> {
    return this.getById<Vessel>(STORE_NAMES.VESSELS, id);
  }

  async getVesselsByCompany(companyId: string): Promise<Vessel[]> {
    return this.getByIndex<Vessel>(
      STORE_NAMES.VESSELS,
      INDEX_NAMES.VESSEL_BY_COMPANY,
      companyId
    );
  }

  // Seafarer methods
  async createSeafarer(data: Omit<Seafarer, keyof BaseEntity>): Promise<Seafarer> {
    return this.create<Seafarer>(STORE_NAMES.SEAFARERS, data);
  }

  async getSeafarer(id: string): Promise<Seafarer | null> {
    return this.getById<Seafarer>(STORE_NAMES.SEAFARERS, id);
  }

  async getSeafarersByCompany(companyId: string): Promise<Seafarer[]> {
    return this.getByIndex<Seafarer>(
      STORE_NAMES.SEAFARERS,
      INDEX_NAMES.SEAFARER_BY_COMPANY,
      companyId
    );
  }

  // Crew Change methods
  async createCrewChange(data: Omit<CrewChange, keyof BaseEntity>): Promise<CrewChange> {
    return this.create<CrewChange>(STORE_NAMES.CREW_CHANGES, data);
  }

  // Payroll methods
  async createPayroll(data: Omit<Payroll, keyof BaseEntity>): Promise<Payroll> {
    return this.create<Payroll>(STORE_NAMES.PAYROLLS, data);
  }

  // Document methods
  async createDocument(data: Omit<Document, keyof BaseEntity>): Promise<Document> {
    return this.create<Document>(STORE_NAMES.DOCUMENTS, data);
  }

  // Notification methods
  async createNotification(data: Omit<Notification, keyof BaseEntity>): Promise<Notification> {
    return this.create<Notification>(STORE_NAMES.NOTIFICATIONS, {
      ...data,
      read: false,
    });
  }

  async getUnreadNotifications(companyId: string): Promise<Notification[]> {
    const notifications = await this.getByIndex<Notification>(
      STORE_NAMES.NOTIFICATIONS,
      INDEX_NAMES.NOTIFICATION_BY_READ_STATUS,
      false
    );
    
    return notifications.filter(n => n.companyId === companyId);
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await this.update<Notification>(STORE_NAMES.NOTIFICATIONS, id, { read: true });
  }

  // Applicant methods
  async createApplicant(data: Omit<Applicant, keyof BaseEntity>): Promise<Applicant> {
    return this.create<Applicant>(STORE_NAMES.APPLICANTS, data);
  }

  async getApplicantsByCompany(companyId: string): Promise<Applicant[]> {
    return this.getByIndex<Applicant>(STORE_NAMES.APPLICANTS, INDEX_NAMES.APPLICANT_BY_COMPANY, companyId);
  }

  async updateApplicant(id: string, updates: Partial<Omit<Applicant, keyof BaseEntity>>): Promise<Applicant> {
    return this.update<Applicant>(STORE_NAMES.APPLICANTS, id, updates);
  }

  async deleteApplicant(id: string): Promise<void> {
    return this.delete(STORE_NAMES.APPLICANTS, id);
  }

  // System Settings methods
  async createSystemSettings(data: Omit<SystemSettings, keyof BaseEntity>): Promise<SystemSettings> {
    return this.create<SystemSettings>(STORE_NAMES.SYSTEM_SETTINGS, data);
  }

  async getSystemSettings(companyId: string): Promise<SystemSettings | null> {
    const settings = await this.getByIndex<SystemSettings>(
      STORE_NAMES.SYSTEM_SETTINGS,
      INDEX_NAMES.SYSTEM_SETTINGS_BY_COMPANY,
      companyId
    );
    return settings.length > 0 ? settings[0] : null;
  }

  async updateSystemSettings(id: string, updates: Partial<Omit<SystemSettings, keyof BaseEntity>>): Promise<SystemSettings> {
    return this.update<SystemSettings>(STORE_NAMES.SYSTEM_SETTINGS, id, updates);
  }

  async deleteSystemSettings(id: string): Promise<void> {
    return this.delete(STORE_NAMES.SYSTEM_SETTINGS, id);
  }
}

// Export a singleton instance
export const db = DatabaseService.getInstance();
