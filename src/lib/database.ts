// IndexedDB Database Layer for Seafarer Management System

export interface Seafarer {
  id: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nationality: string;
    dateOfBirth: string;
    passportNumber: string;
    seamanBook: string;
  };
  qualifications: {
    rank: string;
    certificates: Certificate[];
    medicalCertificate?: MedicalCertificate;
  };
  employment: {
    status: 'active' | 'available' | 'onboard' | 'leave' | 'inactive';
    currentVessel?: string;
    signOnDate?: string;
    signOffDate?: string;
    contractEnd?: string;
  };
  financial: {
    basicWage: number;
    currency: string;
    allotments: Allotment[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface Certificate {
  id: string;
  type: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  status: 'valid' | 'expiring' | 'expired';
}

export interface MedicalCertificate {
  id: string;
  type: string;
  issueDate: string;
  expiryDate: string;
  doctor: string;
  status: 'valid' | 'expiring' | 'expired';
}

export interface Allotment {
  id: string;
  beneficiaryName: string;
  relationship: string;
  percentage: number;
  bankDetails: {
    accountNumber: string;
    bankName: string;
    routingNumber: string;
  };
}

export interface Vessel {
  id: string;
  name: string;
  type: string;
  flag: string;
  imo: string;
  crew: {
    seafarerId: string;
    rank: string;
    joinDate: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface Roster {
  id: string;
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

export interface PayrollRecord {
  id: string;
  seafarerId: string;
  period: {
    start: string;
    end: string;
  };
  earnings: {
    basicWage: number;
    overtime: number;
    allowances: number;
    bonuses: number;
  };
  deductions: {
    taxes: number;
    insurance: number;
    allotments: number;
    other: number;
  };
  netPay: number;
  currency: string;
  status: 'draft' | 'processed' | 'paid';
  createdAt: string;
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
        needCrew: totalVessels - fullyMannedVessels,
      },
      payroll: {
        monthlyTotal: monthlyPayroll,
        recordsCount: payroll.length,
      },
    };
  }
}

export const db = new SeafarerDatabase();