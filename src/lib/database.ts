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
  async create<T extends { id: string; createdAt: string; updatedAt: string }>(
    storeName: string, 
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const now = new Date().toISOString();
    const newItem = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as T;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(newItem);

      request.onsuccess = () => {
        resolve(newItem);
      };

      request.onerror = () => {
        reject(new Error(`Failed to create item in ${storeName}`));
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

  async update<T extends { id: string; updatedAt: string; createdAt: string }>(
    storeName: string,
    data: T & { id: string }
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // First, get the existing item to preserve the createdAt field
    const existingItem = await this.read<T>(storeName, data.id);
    if (!existingItem) {
      throw new Error(`Item with id ${data.id} not found in ${storeName}`);
    }

    const updatedItem = {
      ...data,
      createdAt: existingItem.createdAt, // Preserve original creation date
      updatedAt: new Date().toISOString(),
    } as T;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(updatedItem);

      request.onsuccess = () => {
        resolve(updatedItem);
      };

      request.onerror = () => {
        reject(new Error(`Failed to update item in ${storeName}`));
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
  async createCompany(companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company> {
    // Ensure required fields are present with proper types
    const company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'> = {
      name: companyData.name || '',
      code: companyData.code || '',
      address: {
        street: companyData.address?.street || '',
        city: companyData.address?.city || '',
        country: companyData.address?.country || '',
        postalCode: companyData.address?.postalCode || ''
      },
      contact: {
        email: companyData.contact?.email || '',
        phone: companyData.contact?.phone || ''
      },
      settings: {
        currency: companyData.settings?.currency || 'USD',
        timezone: companyData.settings?.timezone || 'UTC',
        fiscalYearStart: companyData.settings?.fiscalYearStart || '01-01'
      },
      ...companyData
    };
    return this.create<Company>('companies', company);
  }

  async getAllCompanies(): Promise<Company[]> {
    return this.getAll<Company>('companies');
  }

  // Seafarer management methods
  async createSeafarer(seafarerData: Omit<Seafarer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Seafarer> {
    // Ensure required fields are present with proper types
    const seafarer: Omit<Seafarer, 'id' | 'createdAt' | 'updatedAt'> = {
      companyId: seafarerData.companyId || '',
      personalInfo: {
        firstName: seafarerData.personalInfo?.firstName || '',
        lastName: seafarerData.personalInfo?.lastName || '',
        dateOfBirth: seafarerData.personalInfo?.dateOfBirth || '',
        nationality: seafarerData.personalInfo?.nationality || '',
        ...seafarerData.personalInfo
      },
      employment: {
        status: 'available',
        ...seafarerData.employment
      },
      ...seafarerData
    };
    return this.create<Seafarer>('seafarers', seafarer);
  }

  async getSeafarersByStatus(status: Seafarer['employment']['status']): Promise<Seafarer[]> {
    return this.getByIndex<Seafarer>('seafarers', 'employment.status', status);
  }

  async getSeafarersByRank(rank: string): Promise<Seafarer[]> {
    return this.getByIndex<Seafarer>('seafarers', 'qualifications.rank', rank);
  }

  async getSeafarersByCompany(companyId: string): Promise<Seafarer[]> {

  // Vessel management methods
  async getVesselsByCompany(companyId: string): Promise<Vessel[]> {
    return this.getByIndex<Vessel>('vessels', 'companyId', companyId);
  }

  async createVessel(vesselData: Omit<Vessel, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vessel> {
    // Ensure required fields are present with proper types
    const vessel: Omit<Vessel, 'id' | 'createdAt' | 'updatedAt'> = {
      name: vesselData.name || '',
      type: vesselData.type || 'cargo',
      companyId: vesselData.companyId || '',
      imoNumber: vesselData.imoNumber || '',
      flag: vesselData.flag || '',
      documents: vesselData.documents || [],
      ...vesselData
    };
    return this.create<Vessel>('vessels', vessel);
  }

  // Payroll management methods
  async createPayrollRecord(payrollData: Omit<PayrollRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<PayrollRecord> {
    // Ensure required fields are present with proper types
    const payroll: Omit<PayrollRecord, 'id' | 'createdAt' | 'updatedAt'> = {
      companyId: payrollData.companyId || '',
      seafarerId: payrollData.seafarerId || '',
      status: payrollData.status || 'draft',
      currency: payrollData.currency || 'USD',
      period: {
        start: payrollData.period?.start || new Date().toISOString().split('T')[0],
        end: payrollData.period?.end || new Date().toISOString().split('T')[0]
      },
      earnings: {
        basic: payrollData.earnings?.basic || 0,
        overtime: payrollData.earnings?.overtime || 0,
        bonus: payrollData.earnings?.bonus || 0,
        allowances: payrollData.earnings?.allowances || {},
        other: payrollData.earnings?.other || 0,
        total: payrollData.earnings?.total || 0
      },
      deductions: {
        tax: payrollData.deductions?.tax || 0,
        socialSecurity: payrollData.deductions?.socialSecurity || 0,
        insurance: payrollData.deductions?.insurance || 0,
        unionDues: payrollData.deductions?.unionDues || 0,
        other: payrollData.deductions?.other || 0,
        total: payrollData.deductions?.total || 0
      },
      netPay: payrollData.netPay || 0,
      ...payrollData
    };
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
