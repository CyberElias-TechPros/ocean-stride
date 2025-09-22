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
  type Applicant,
  type Certificate,
  type Rank,
  type CrewAssignment,
  type PayrollSettings,
  type CompanySettings
} from './schemas_v2';

class DatabaseServiceV2 {
  private static instance: DatabaseServiceV2;
  private db: IDBDatabase | null = null;
  private dbName = 'OceanStrideDB_v3'; // Incremented version
  private version = 3; // Incremented version

  private constructor() {}

  static getInstance(): DatabaseServiceV2 {
    if (!DatabaseServiceV2.instance) {
      DatabaseServiceV2.instance = new DatabaseServiceV2();
    }
    return DatabaseServiceV2.instance;
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
      store.createIndex(INDEX_NAMES.SEAFARER_BY_RANK + 'Id', 'employment.rankId', { unique: false });
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
      store.createIndex(INDEX_NAMES.PAYROLL_BY_STATUS, 'companyId', { unique: false });
    }

    // Documents store
    if (!db.objectStoreNames.contains(STORE_NAMES.DOCUMENTS)) {
      const store = db.createObjectStore(STORE_NAMES.DOCUMENTS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.DOCUMENT_BY_TYPE, 'type', { unique: false });
      store.createIndex(INDEX_NAMES.DOCUMENT_BY_ENTITY, ['relatedTo.entityType', 'relatedTo.entityId'], { unique: false });
      store.createIndex(INDEX_NAMES.DOCUMENT_BY_EXPIRY, 'expiryDate', { unique: false });
    }

    // Certificates store
    if (!db.objectStoreNames.contains(STORE_NAMES.CERTIFICATES)) {
      const store = db.createObjectStore(STORE_NAMES.CERTIFICATES, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.CERTIFICATE_BY_SEAFARER, 'seafarerId', { unique: false });
      store.createIndex(INDEX_NAMES.CERTIFICATE_BY_TYPE, 'type', { unique: false });
      store.createIndex(INDEX_NAMES.CERTIFICATE_BY_STATUS, 'status', { unique: false });
      store.createIndex(INDEX_NAMES.CERTIFICATE_BY_EXPIRY, 'expiryDate', { unique: false });
    }

    // Ranks store
    if (!db.objectStoreNames.contains(STORE_NAMES.RANKS)) {
      const store = db.createObjectStore(STORE_NAMES.RANKS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.RANK_BY_COMPANY, 'companyId', { unique: false });
      store.createIndex(INDEX_NAMES.RANK_BY_DEPARTMENT, 'department', { unique: false });
    }

    // Crew Assignments store
    if (!db.objectStoreNames.contains(STORE_NAMES.CREW_ASSIGNMENTS)) {
      const store = db.createObjectStore(STORE_NAMES.CREW_ASSIGNMENTS, { keyPath: 'id' });
      store.createIndex(INDEX_NAMES.CREW_ASSIGNMENT_BY_SEAFARER, 'seafarerId', { unique: false });
      store.createIndex(INDEX_NAMES.CREW_ASSIGNMENT_BY_VESSEL, 'vesselId', { unique: false });
      store.createIndex(INDEX_NAMES.CREW_ASSIGNMENT_BY_STATUS, 'status', { unique: false });
      store.createIndex(INDEX_NAMES.CREW_ASSIGNMENT_BY_DATE_RANGE, ['startDate', 'endDate'], { unique: false });
      store.createIndex('by_company', 'companyId', { unique: false });
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

  // Read
  async get<T extends BaseEntity>(storeName: string, id: string): Promise<T | null> {
    if (!id) {
      console.warn(`Attempted to get ${storeName} with empty ID`);
      return null;
    }

    return this.withTransaction(storeName, 'readonly', (tx) => {
      const store = tx.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result || null);
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
      
      // Get existing entity
      const existing = await new Promise<T>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!existing) {
        throw new Error(`${storeName} with id ${id} not found`);
      }

      // Merge updates and update timestamps
      const updated = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Save back to the store
      await new Promise<void>((resolve, reject) => {
        const request = store.put(updated);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      return updated as T;
    });
  }

  // Delete
  async delete(storeName: string, id: string): Promise<boolean> {
    return this.withTransaction(storeName, 'readwrite', (tx) => {
      const store = tx.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Get all
  async getAll<T>(storeName: string): Promise<T[]> {
    return this.withTransaction(storeName, 'readonly', (tx) => {
      const store = tx.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Get by index
  async getByIndex<T>(
    storeName: string,
    indexName: string,
    value: any
  ): Promise<T[]> {
    return this.withTransaction(storeName, 'readonly', (tx) => {
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      
      return new Promise((resolve, reject) => {
        const request = index.getAll(value);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Get by index range
  async getByIndexRange<T>(
    storeName: string,
    indexName: string,
    range: IDBKeyRange
  ): Promise<T[]> {
    return this.withTransaction(storeName, 'readonly', (tx) => {
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      
      return new Promise((resolve, reject) => {
        const request = index.getAll(range);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Get by compound index
  async getByCompoundIndex<T>(
    storeName: string,
    indexName: string,
    values: any[]
  ): Promise<T[]> {
    return this.withTransaction(storeName, 'readonly', (tx) => {
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      
      return new Promise((resolve, reject) => {
        const request = index.getAll(IDBKeyRange.only(values));
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Get by key range
  async getByKeyRange<T>(
    storeName: string,
    range: IDBKeyRange
  ): Promise<T[]> {
    return this.withTransaction(storeName, 'readonly', (tx) => {
      const store = tx.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.getAll(range);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Count records
  async count(storeName: string, indexName?: string, key?: any): Promise<number> {
    return this.withTransaction(storeName, 'readonly', (tx) => {
      const store = tx.objectStore(storeName);
      const target = indexName ? store.index(indexName) : store;
      
      return new Promise((resolve, reject) => {
        const request = key !== undefined 
          ? target.count(key) 
          : target.count();
          
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Clear store
  async clear(storeName: string): Promise<void> {
    return this.withTransaction(storeName, 'readwrite', (tx) => {
      const store = tx.objectStore(storeName);
      
      return new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Delete database (use with caution!)
  static async deleteDatabase(dbName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Migration from v2 to v3
  async migrateFromV2(v2Db: IDBDatabase): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Migrate companies
    const companies = await this.getAllFromStore<Company>(v2Db, 'companies');
    for (const company of companies) {
      await this.create(STORE_NAMES.COMPANIES, company);
    }

    // Migrate vessels
    const vessels = await this.getAllFromStore<Vessel>(v2Db, 'vessels');
    for (const vessel of vessels) {
      await this.create(STORE_NAMES.VESSELS, vessel);
    }

    // Migrate seafarers
    const seafarers = await this.getAllFromStore<Seafarer>(v2Db, 'seafarers');
    for (const seafarer of seafarers) {
      // Add rankId if not exists
      if (!seafarer.employment.rankId) {
        // Try to find rank by name
        const ranks = await this.getByIndex<Rank>(
          STORE_NAMES.RANKS,
          'name',
          seafarer.employment.rank
        );
        
        if (ranks.length > 0) {
          seafarer.employment.rankId = ranks[0].id;
        } else {
          // Create a default rank if not found
          const defaultRank: Omit<Rank, 'id' | 'createdAt' | 'updatedAt'> = {
            name: seafarer.employment.rank,
            department: seafarer.employment.department || 'deck',
            level: 1,
            baseSalary: seafarer.employment.baseWage || 0,
            currency: seafarer.employment.wageCurrency || 'USD',
            isOfficer: seafarer.employment.rank.toLowerCase().includes('officer') || 
                       seafarer.employment.rank.toLowerCase().includes('captain') ||
                       seafarer.employment.rank.toLowerCase().includes('chief'),
            companyId: seafarer.companyId
          };
          
          const newRank = await this.create(STORE_NAMES.RANKS, defaultRank);
          seafarer.employment.rankId = newRank.id;
        }
      }
      
      await this.create(STORE_NAMES.SEAFARERS, seafarer);
    }

    // Migrate crew changes
    const crewChanges = await this.getAllFromStore<CrewChange>(v2Db, 'crewChanges');
    for (const change of crewChanges) {
      await this.create(STORE_NAMES.CREW_CHANGES, change);
    }

    // Migrate payrolls
    const payrolls = await this.getAllFromStore<Payroll>(v2Db, 'payrolls');
    for (const payroll of payrolls) {
      await this.create(STORE_NAMES.PAYROLLS, payroll);
    }

    // Migrate documents
    const documents = await this.getAllFromStore<Document>(v2Db, 'documents');
    for (const doc of documents) {
      await this.create(STORE_NAMES.DOCUMENTS, doc);
    }

    // Migrate notifications
    const notifications = await this.getAllFromStore<Notification>(v2Db, 'notifications');
    for (const notification of notifications) {
      await this.create(STORE_NAMES.NOTIFICATIONS, notification);
    }

    // Migrate applicants
    const applicants = await this.getAllFromStore<Applicant>(v2Db, 'applicants');
    for (const applicant of applicants) {
      await this.create(STORE_NAMES.APPLICANTS, applicant);
    }
  }

  private getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all seafarers by company
  async getSeafarersByCompany(companyId: string): Promise<Seafarer[]> {
    return this.getByIndex<Seafarer>(STORE_NAMES.SEAFARERS, INDEX_NAMES.SEAFARER_BY_COMPANY, companyId);
  }

  // Get all vessels by company
  async getVesselsByCompany(companyId: string): Promise<Vessel[]> {
    return this.getByIndex<Vessel>(STORE_NAMES.VESSELS, INDEX_NAMES.VESSEL_BY_COMPANY, companyId);
  }

  // Get active crew assignments for a vessel
  async getActiveCrewAssignments(vesselId: string): Promise<CrewAssignment[]> {
    const now = new Date().toISOString();
    const assignments = await this.getByIndex<CrewAssignment>(
      STORE_NAMES.CREW_ASSIGNMENTS, 
      INDEX_NAMES.CREW_ASSIGNMENT_BY_VESSEL, 
      vesselId
    );
    
    return assignments.filter(a => 
      a.status === 'active' && 
      (!a.startDate || a.startDate <= now) &&
      (!a.endDate || a.endDate >= now)
    );
  }

  // Get expiring certificates
  async getExpiringCertificates(days: number = 30): Promise<Certificate[]> {
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(now.getDate() + days);
    
    const range = IDBKeyRange.bound(
      now.toISOString(),
      expiryDate.toISOString(),
      false,
      false
    );
    
    return this.getByIndexRange<Certificate>(
      STORE_NAMES.CERTIFICATES,
      INDEX_NAMES.CERTIFICATE_BY_EXPIRY,
      range
    );
  }

  // Get company settings or create default
  async getCompanySettings(companyId: string): Promise<CompanySettings> {
    const settings = await this.getByIndex<CompanySettings>(
      STORE_NAMES.COMPANY_SETTINGS,
      INDEX_NAMES.COMPANY_SETTINGS_BY_COMPANY,
      companyId
    );
    
    if (settings.length > 0) {
      return settings[0];
    }
    
    // Create default settings
    const defaultSettings: Omit<CompanySettings, 'id' | 'createdAt' | 'updatedAt'> = {
      companyId,
      dateFormat: 'YYYY-MM-DD',
      timezone: 'UTC',
      currency: 'USD',
      defaultVesselRotationDays: 30,
      defaultLeaveDays: 30,
      notificationSettings: {
        certificateExpiryDays: 30,
        contractExpiryDays: 30,
        sendEmail: true,
        sendSMS: false
      },
      documentSettings: {
        requiredCertificates: [],
        documentExpiryWarningDays: 60
      }
    };
    
    return this.create(STORE_NAMES.COMPANY_SETTINGS, defaultSettings);
  }
}

// Export a singleton instance
export const db = DatabaseServiceV2.getInstance();
