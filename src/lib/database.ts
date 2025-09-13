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
  Financial
} from './schemas';

type IDBValidKey = string | number | Date | ArrayBuffer | ArrayBufferView | IDBKeyRange;

interface MedicalCertificate {
  id: string;
  type: string;
  issueDate: string;
  expiryDate: string;
  doctor: string;
  status: 'valid' | 'expiring' | 'expired';
}

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

interface Allotment {
  id: string;
  beneficiaryName: string;
  accountNumber: string;
  bankName: string;
  amount: number;
  currency: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export class SeafarerDatabase {
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
  async create<T extends { id: string }>(
    storeName: string, 
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
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
      } as T;

      const request = store.add(newItem);

      request.onsuccess = () => {
        resolve(newItem);
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

  // Company management methods
  async createCompany(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company> {
    return this.create<Company>('companies', company);
  }

  async getAllCompanies(): Promise<Company[]> {
    return this.getAll<Company>('companies');
  }

  // Seafarer management methods
  async createSeafarer(seafarer: Omit<Seafarer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Seafarer> {
    return this.create<Seafarer>('seafarers', seafarer);
  }

  async getSeafarersByStatus(status: Seafarer['employment']['status']): Promise<Seafarer[]> {
    return this.getByIndex<Seafarer>('seafarers', 'employment.status', status);
  }

  async getSeafarersByRank(rank: string): Promise<Seafarer[]> {
    return this.getByIndex<Seafarer>('seafarers', 'qualifications.rank', rank);
  }

  async getSeafarersByCompany(companyId: string): Promise<Seafarer[]> {
    return this.getByIndex<Seafarer>('seafarers', 'companyId', companyId);
  }

  // Vessel management methods
  async getVesselsByCompany(companyId: string): Promise<Vessel[]> {
    return this.getByIndex<Vessel>('vessels', 'companyId', companyId);
  }

  async createVessel(vessel: Omit<Vessel, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vessel> {
    return this.create<Vessel>('vessels', vessel);
  }

  // Payroll management methods
  async createPayrollRecord(payroll: Omit<PayrollRecord, 'id' | 'createdAt'>): Promise<PayrollRecord> {
    return this.create<PayrollRecord>('payroll', payroll);
  }

  async getPayrollBySeafarer(seafarerId: string): Promise<PayrollRecord[]> {
    return this.getByIndex<PayrollRecord>('payroll', 'seafarerId', seafarerId);
  }

  // Dashboard analytics
  async getDashboardStats() {
    const seafarers = await this.getAll<Seafarer>('seafarers');
    const vessels = await this.getAll<Vessel>('vessels');
    const payroll = await this.getAll<PayrollRecord>('payroll');

    // Calculate statistics
    const totalSeafarers = seafarers.length;
    const activeSeafarers = seafarers.filter(s => 
      s.employment?.status === 'active' || s.employment?.status === 'onboard'
    ).length;
    const availableSeafarers = seafarers.filter(s => 
      s.employment?.status === 'available'
    ).length;

    const totalVessels = vessels.length;
    const fullyMannedVessels = 0; // This would need to be calculated based on crew assignments

    return {
      seafarers: {
        total: totalSeafarers,
        active: activeSeafarers,
        available: availableSeafarers,
      },
      vessels: {
        total: totalVessels,
        fullyManned: fullyMannedVessels,
        needCrew: 0, // This would need to be calculated based on crew requirements
      },
      payroll: {
        monthlyTotal: payroll.reduce((sum, record) => sum + (record.netSalary || 0), 0),
        recordsCount: payroll.length,
      },
    };
  }
}

// Export a singleton instance of the database
export const db = new SeafarerDatabase();

// Initialize the database when this module is loaded
db.init().catch(error => {
  console.error('Failed to initialize database:', error);
});
