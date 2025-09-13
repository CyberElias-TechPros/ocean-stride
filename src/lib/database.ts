// IndexedDB Database Layer for Multi-Tenant Seafarer Management System
import type {
  Company,
  Seafarer,
  Vessel,
  CrewAssignment,
  PayrollRecord,
  Address,
  Contact,
  CompanySettings,
  PersonalInfo,
  Certificate,
  Employment,
  Financial,
  Allotment,
  MedicalCertificate
} from './schemas';

type IDBValidKey = string | number | Date | ArrayBuffer | ArrayBufferView | IDBKeyRange;

interface Roster {
  id: string;
  companyId: string;
  vesselId: string;
  startDate: string;
  endDate: string;
  positions: {
    rank: string;
    seafarerId?: string;
    status: 'filled' | 'vacant' | 'pending';
  }[];
  createdAt: string;
  updatedAt: string;
}

export class SeafarerDatabase {

// Database class implementation
class SeafarerDatabase {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'SeafarerManagementDB';
  private readonly dbVersion = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open database');
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.setupDatabase(db);
      };
    });
  }

  private setupDatabase(db: IDBDatabase) {
    // Create object stores
    if (!db.objectStoreNames.contains('companies')) {
      const companyStore = db.createObjectStore('companies', { keyPath: 'id' });
      companyStore.createIndex('name', 'name', { unique: true });
    }

    if (!db.objectStoreNames.contains('seafarers')) {
      const seafarerStore = db.createObjectStore('seafarers', { keyPath: 'id' });
      seafarerStore.createIndex('companyId', 'companyId', { unique: false });
      seafarerStore.createIndex('email', 'personalInfo.email', { unique: true });
    }

    if (!db.objectStoreNames.contains('vessels')) {
      const vesselStore = db.createObjectStore('vessels', { keyPath: 'id' });
      vesselStore.createIndex('companyId', 'companyId', { unique: false });
      vesselStore.createIndex('imo', 'imo', { unique: true });
    }

    if (!db.objectStoreNames.contains('crewAssignments')) {
      const crewAssignmentStore = db.createObjectStore('crewAssignments', { keyPath: 'id' });
      crewAssignmentStore.createIndex('vesselId', 'vesselId', { unique: false });
      crewAssignmentStore.createIndex('seafarerId', 'seafarerId', { unique: false });
    }

    if (!db.objectStoreNames.contains('payroll')) {
      const payrollStore = db.createObjectStore('payroll', { keyPath: 'id' });
      payrollStore.createIndex('seafarerId', 'seafarerId', { unique: false });
      payrollStore.createIndex('companyId', 'companyId', { unique: false });
    }
  }
  // Generic CRUD operations
  async create<T extends { id: string }>(storeName: string, data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const now = new Date().toISOString();
      const newItem = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };

      const request = store.add(newItem);

      request.onsuccess = () => {
        resolve(newItem as T);
      };

      request.onerror = () => {
        reject(new Error(`Failed to create ${storeName}`));
      };
    });
  }

  async read<T>(storeName: string, id: string): Promise<T | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error(`Failed to read ${storeName} with id ${id}`));
      };
    });
  }

  async update<T extends { id: string }>(storeName: string, data: T): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const updatedItem = {
        ...data,
        updatedAt: new Date().toISOString(),
      };

      const request = store.put(updatedItem);

      request.onsuccess = () => {
        resolve(updatedItem as T);
      };

      request.onerror = () => {
        reject(new Error(`Failed to update ${storeName} with id ${data.id}`));
      };
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error(`Failed to delete ${storeName} with id ${id}`));
      };
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error(`Failed to get all ${storeName}`));
      };
    });
  }

  async getByIndex<T>(
    storeName: string,
    indexName: string,
    value: IDBValidKey
  ): Promise<T[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error(`Failed to query ${storeName} by index ${indexName}`));
      };
    });
  }
    status: 'active' | 'available' | 'onboard' | 'leave' | 'inactive';
    currentVessel?: string;
    signOnDate?: string;
    signOffDate?: string;
    contractEnd?: string;
  };
  qualifications: {
    rank: string;
    certificates: Certificate[];
  };
  medicalCertificates: MedicalCertificate[];
  allotments: Allotment[];
  createdAt: string;
  updatedAt: string;
}

class SeafarerDatabase {
  private db: IDBDatabase | null = null;
  private readonly dbName = 'SeafarerManagementDB';
  private readonly dbVersion = 1;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Companies store
        if (!db.objectStoreNames.contains('companies')) {
          const companiesStore = db.createObjectStore('companies', { keyPath: 'id' });
          companiesStore.createIndex('name', 'name');
          companiesStore.createIndex('code', 'code', { unique: true });
        }

        // Seafarers store
        if (!db.objectStoreNames.contains('seafarers')) {
          const seafarersStore = db.createObjectStore('seafarers', { keyPath: 'id' });
          seafarersStore.createIndex('email', 'personalInfo.email', { unique: true });
          seafarersStore.createIndex('status', 'employment.status');
          seafarersStore.createIndex('rank', 'qualifications.rank');
        }

        // Vessels store
        if (!db.objectStoreNames.contains('vessels')) {
          const vesselsStore = db.createObjectStore('vessels', { keyPath: 'id' });
          vesselsStore.createIndex('name', 'name');
          vesselsStore.createIndex('type', 'type');
        }

        // Rosters store
        if (!db.objectStoreNames.contains('rosters')) {
          const rostersStore = db.createObjectStore('rosters', { keyPath: 'id' });
          rostersStore.createIndex('vesselId', 'vesselId');
          rostersStore.createIndex('startDate', 'startDate');
        }

        // Payroll store
        if (!db.objectStoreNames.contains('payroll')) {
          const payrollStore = db.createObjectStore('payroll', { keyPath: 'id' });
          payrollStore.createIndex('seafarerId', 'seafarerId');
          payrollStore.createIndex('period', 'period.start');
          payrollStore.createIndex('status', 'status');
        }

        // Certificates store
        if (!db.objectStoreNames.contains('certificates')) {
          const certificatesStore = db.createObjectStore('certificates', { keyPath: 'id' });
          certificatesStore.createIndex('seafarerId', 'seafarerId');
          certificatesStore.createIndex('expiryDate', 'expiryDate');
          certificatesStore.createIndex('status', 'status');
        }
      };
    });
  }

  // Generic CRUD operations
  async create<T>(storeName: string, data: T): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  async read<T>(storeName: string, id: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async update<T>(storeName: string, data: T): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Company management methods
  async createCompany(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company> {
    const now = new Date().toISOString();
    const newCompany: Company = {
      ...company,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    return this.create('companies', newCompany);
  }

  async getAllCompanies(): Promise<Company[]> {
    return this.getAll('companies');
  }

  // Specialized methods for seafarers
  async createSeafarer(seafarer: Omit<Seafarer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Seafarer> {
    const now = new Date().toISOString();
    const newSeafarer: Seafarer = {
      ...seafarer,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    return this.create('seafarers', newSeafarer);
  }

  async getSeafarersByStatus(status: Seafarer['employment']['status']): Promise<Seafarer[]> {
    return this.getByIndex('seafarers', 'status', status);
  }

  async getSeafarersByRank(rank: string): Promise<Seafarer[]> {
    return this.getByIndex('seafarers', 'rank', rank);
  }

  async getSeafarersByCompany(companyId: string): Promise<Seafarer[]> {
    const allSeafarers = await this.getAll<Seafarer>('seafarers');
    return allSeafarers.filter(s => s.companyId === companyId);
  }

  async getVesselsByCompany(companyId: string): Promise<Vessel[]> {
    const allVessels = await this.getAll<Vessel>('vessels');
    return allVessels.filter(v => v.companyId === companyId);
  }

  async updateSeafarer(id: string, updates: Partial<Seafarer>): Promise<Seafarer> {
    const transaction = this.db!.transaction(['seafarers'], 'readwrite');
    const store = transaction.objectStore('seafarers');
    
    // Get existing seafarer
    const existing = await new Promise<Seafarer>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    if (!existing) {
      throw new Error('Seafarer not found');
    }
    
    // Merge updates
    const updated = { ...existing, ...updates };
    
    // Save updated seafarer
    await new Promise<void>((resolve, reject) => {
      const request = store.put(updated);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    return updated;
  }

  async deleteSeafarer(id: string): Promise<void> {
    const transaction = this.db!.transaction(['seafarers'], 'readwrite');
    const store = transaction.objectStore('seafarers');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Specialized methods for vessels
  async createVessel(vessel: Omit<Vessel, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vessel> {
    const now = new Date().toISOString();
    const newVessel: Vessel = {
      ...vessel,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    return this.create('vessels', newVessel);
  }

  // Specialized methods for payroll
  async createPayrollRecord(payroll: Omit<PayrollRecord, 'id' | 'createdAt'>): Promise<PayrollRecord> {
    const now = new Date().toISOString();
    const newPayroll: PayrollRecord = {
      ...payroll,
      id: crypto.randomUUID(),
      createdAt: now,
    };
    return this.create('payroll', newPayroll);
  }

  async getPayrollBySeafarer(seafarerId: string): Promise<PayrollRecord[]> {
    return this.getByIndex('payroll', 'seafarerId', seafarerId);
  }

  // Dashboard analytics
  async getDashboardStats() {
    const seafarers = await this.getAll<Seafarer>('seafarers');
    const vessels = await this.getAll<Vessel>('vessels');
    const payroll = await this.getAll<PayrollRecord>('payroll');

    const activeSeafarers = seafarers.filter(s => s.employment.status === 'active').length;
    const onboardSeafarers = seafarers.filter(s => s.employment.status === 'onboard').length;
    const availableSeafarers = seafarers.filter(s => s.employment.status === 'available').length;
    
    const totalVessels = vessels.length;
    const fullyMannedVessels = vessels.filter(v => v.crew.length >= 12).length; // Assuming 12 is minimum crew
    
    const monthlyPayroll = payroll
      .filter(p => new Date(p.period.start).getMonth() === new Date().getMonth())
      .reduce((sum, p) => sum + p.netPay, 0);

    return {
      seafarers: {
        total: seafarers.length,
        active: activeSeafarers,
        onboard: onboardSeafarers,
        available: availableSeafarers,
      },
      vessels: {
        total: totalVessels,
        fullyManned: fullyMannedVessels,
        needCrew: 0, // This will be calculated based on actual data
      },
      payroll: {
        monthlyTotal: 0, // This will be calculated based on actual data
        recordsCount: 0, // This will be calculated based on actual data
export const db = new SeafarerDatabase();

// Initialize the database when this module is loaded
db.init().catch(error => {
  console.error('Failed to initialize database:', error);
});