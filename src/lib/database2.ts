import { v4 as uuidv4 } from 'uuid';
import { 
  STORE_NAMES, 
  INDEX_NAMES, 
  type BaseEntity, 
  type Company, 
  type Vessel, 
  type Seafarer,
  type CrewChange,
  type Payroll,
  type Document,
  type Notification,
  type EntityType,
  type EntityName
} from './schemas';

class DatabaseService {
  private static instance: DatabaseService;
  private db: IDBDatabase | null = null;
  private dbName = 'OceanStrideDB';
  private version = 1;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  isInitialized(): boolean {
    return this.db !== null;
  }

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Database error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
      };
    });
  }

  private createStores(db: IDBDatabase) {
    // Companies store
    if (!db.objectStoreNames.contains(STORE_NAMES.COMPANIES)) {
      const store = db.createObjectStore(STORE_NAMES.COMPANIES, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.COMPANY_BY_NAME, 'name', { unique: true });
    }

    // Vessels store
    if (!db.objectStoreNames.contains(STORE_NAMES.VESSELS)) {
      const store = db.createObjectStore(STORE_NAMES.VESSELS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.VESSEL_BY_NAME, 'name', { unique: false });
      store.createIndex(INDEX_NAMES.VESSEL_BY_IMO, 'imoNumber', { unique: true });
      store.createIndex(INDEX_NAMES.VESSEL_BY_STATUS, 'status', { unique: false });
      store.createIndex(INDEX_NAMES.VESSEL_BY_COMPANY, 'companyId', { unique: false });
    }

    // Seafarers store
    if (!db.objectStoreNames.contains(STORE_NAMES.SEAFARERS)) {
      const store = db.createObjectStore(STORE_NAMES.SEAFARERS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.SEAFARER_BY_NAME, ['personalInfo.lastName', 'personalInfo.firstName'], { unique: false });
      store.createIndex(INDEX_NAMES.SEAFARER_BY_RANK, 'employment.rank', { unique: false });
      store.createIndex(INDEX_NAMES.SEAFARER_BY_STATUS, 'employment.status', { unique: false });
      store.createIndex(INDEX_NAMES.SEAFARER_BY_VESSEL, 'employment.currentVesselId', { unique: false });
      store.createIndex(INDEX_NAMES.SEAFARER_BY_COMPANY, 'companyId', { unique: false });
    }

    // Crew Changes store
    if (!db.objectStoreNames.contains(STORE_NAMES.CREW_CHANGES)) {
      const store = db.createObjectStore(STORE_NAMES.CREW_CHANGES, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.CREW_CHANGE_BY_VESSEL, 'vesselId', { unique: false });
      store.createIndex(INDEX_NAMES.CREW_CHANGE_BY_DATE, 'scheduledDate', { unique: false });
      store.createIndex(INDEX_NAMES.CREW_CHANGE_BY_STATUS, 'status', { unique: false });
    }

    // Payrolls store
    if (!db.objectStoreNames.contains(STORE_NAMES.PAYROLLS)) {
      const store = db.createObjectStore(STORE_NAMES.PAYROLLS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.PAYROLL_BY_SEAFARER, 'seafarerId', { unique: false });
      store.createIndex(INDEX_NAMES.PAYROLL_BY_VESSEL, 'vesselId', { unique: false });
      store.createIndex(INDEX_NAMES.PAYROLL_BY_PERIOD, ['periodStart', 'periodEnd'], { unique: false });
      store.createIndex(INDEX_NAMES.PAYROLL_BY_STATUS, 'status', { unique: false });
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
              console.log(`No ${storeName} found with id ${id}`);
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
}

// Export a singleton instance
export const db = DatabaseService.getInstance();
