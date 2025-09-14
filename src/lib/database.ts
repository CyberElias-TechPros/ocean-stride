import { v4 as uuidv4 } from 'uuid';

// Type definitions for the database entities
export interface Address {
  street: string;
  city: string;
  country: string;
  postalCode: string;
}

export interface Contact {
  email: string;
  phone: string;
  website?: string;
}

export interface CompanySettings {
  currency: string;
  timezone: string;
  fiscalYearStart: string;
}

export interface Company {
  id: string;
  name: string;
  code: string;
  address: Address;
  contact: Contact;
  settings: CompanySettings;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality: string;
  dateOfBirth: string;
  passportNumber: string;
  seamanBook: string;
}

export interface Certificate {
  id: string;
  name: string;
  number: string;
  issuedDate: string;
  expiryDate: string;
  issuingAuthority: string;
  document?: string;
}

export interface Employment {
  status: 'active' | 'available' | 'on-leave' | 'retired';
  currentVessel?: string;
  position: string;
  contractStart?: string;
  contractEnd?: string;
  dayOffDue?: number;
}

export interface Financial {
  bankName: string;
  accountNumber: string;
  iban?: string;
  swiftCode?: string;
  currency: string;
  basicWage: number;
  overtimeRate: number;
}

export interface Seafarer {
  id: string;
  companyId: string;
  personalInfo: PersonalInfo;
  qualifications: {
    rank: string;
    certificates: Certificate[];
  };
  employment: Employment;
  financial: Financial;
  createdAt: string;
  updatedAt: string;
}

export interface Vessel {
  id: string;
  companyId: string;
  name: string;
  type: string;
  imoNumber: string;
  flag: string;
  yearBuilt?: number;
  grossTonnage?: number;
  netTonnage?: number;
  lengthOverall?: number;
  beam?: number;
  draft?: number;
  dwt?: number;
  portOfRegistry?: string;
  documents: Certificate[];
  createdAt: string;
  updatedAt: string;
}

export interface CrewAssignment {
  id: string;
  seafarerId: string;
  vesselId: string;
  position: string;
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface PayrollRecord {
  id: string;
  companyId: string;
  seafarerId: string;
  period: {
    start: string;
    end: string;
  };
  basicSalary: number;
  overtime: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  currency: string;
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
  paymentDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// IndexedDB configuration
const DB_NAME = 'OceanStrideDB';
const DB_VERSION = 3;

interface StoreConfig {
  name: string;
  keyPath: string;
  indexes: Array<{
    name: string;
    keyPath: string | string[];
    options?: IDBIndexParameters;
  }>;
}

const STORES: StoreConfig[] = [
  {
    name: 'companies',
    keyPath: 'id',
    indexes: [
      { name: 'name', keyPath: 'name' },
      { name: 'code', keyPath: 'code' }
    ]
  },
  {
    name: 'seafarers',
    keyPath: 'id',
    indexes: [
      { name: 'companyId', keyPath: 'companyId' },
      { name: 'email', keyPath: 'personalInfo.email' },
      { name: 'rank', keyPath: 'qualifications.rank' },
      { name: 'status', keyPath: 'employment.status' }
    ]
  },
  {
    name: 'vessels',
    keyPath: 'id',
    indexes: [
      { name: 'companyId', keyPath: 'companyId' },
      { name: 'name', keyPath: 'name' },
      { name: 'imo', keyPath: 'imoNumber' }
    ]
  },
  {
    name: 'crew_assignments',
    keyPath: 'id',
    indexes: [
      { name: 'seafarerId', keyPath: 'seafarerId' },
      { name: 'vesselId', keyPath: 'vesselId' },
      { name: 'status', keyPath: 'status' }
    ]
  },
  {
    name: 'payroll',
    keyPath: 'id',
    indexes: [
      { name: 'companyId', keyPath: 'companyId' },
      { name: 'seafarerId', keyPath: 'seafarerId' },
      { name: 'status', keyPath: 'status' },
      { name: 'period', keyPath: 'period.start' }
    ]
  }
];

class SeafarerDatabase {
  private db: IDBDatabase | null = null;
  private static instance: SeafarerDatabase;

  private constructor() {}

  public static getInstance(): SeafarerDatabase {
    if (!SeafarerDatabase.instance) {
      SeafarerDatabase.instance = new SeafarerDatabase();
    }
    return SeafarerDatabase.instance;
  }

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Database initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Remove existing stores
        const existingStores = Array.from(db.objectStoreNames);
        existingStores.forEach(storeName => {
          db.deleteObjectStore(storeName);
        });

        // Create new stores
        STORES.forEach(storeConfig => {
          const store = db.createObjectStore(storeConfig.name, {
            keyPath: storeConfig.keyPath
          });

          storeConfig.indexes.forEach(index => {
            store.createIndex(index.name, index.keyPath, index.options);
          });
        });
      };
    });
  }

  private async withTransaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    callback: (stores: IDBObjectStore | IDBObjectStore[]) => Promise<T> | T
  ): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const storeNamesArray = Array.isArray(storeNames) ? storeNames : [storeNames];
    const transaction = this.db.transaction(storeNamesArray, mode);
    
    return new Promise((resolve, reject) => {
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(new Error('Transaction aborted'));
      
      try {
        const stores = storeNamesArray.length === 1 
          ? transaction.objectStore(storeNamesArray[0])
          : storeNamesArray.map(name => transaction.objectStore(name));
        
        const result = callback(stores);
        
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

  // Generic CRUD operations
  async create<T extends { id: string; createdAt: string; updatedAt: string }>(
    storeName: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    const now = new Date().toISOString();
    const entity = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    } as T;

    return this.withTransaction(storeName, 'readwrite', (store) => {
      return new Promise<T>((resolve, reject) => {
        const request = (store as IDBObjectStore).add(entity);
        request.onsuccess = () => resolve(entity);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getById<T>(storeName: string, id: string): Promise<T | null> {
    return this.withTransaction(storeName, 'readonly', (store) => {
      return new Promise<T | null>((resolve, reject) => {
        const request = (store as IDBObjectStore).get(id);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    return this.withTransaction(storeName, 'readonly', (store) => {
      return new Promise<T[]>((resolve, reject) => {
        const request = (store as IDBObjectStore).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    return this.withTransaction(storeName, 'readonly', (store) => {
      return new Promise<T[]>((resolve, reject) => {
        const index = (store as IDBObjectStore).index(indexName);
        const request = index.getAll(value);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async update<T extends { id: string; updatedAt: string }>(
    storeName: string,
    id: string,
    updates: Partial<T>
  ): Promise<T> {
    const existing = await this.getById<T>(storeName, id);
    if (!existing) {
      throw new Error(`Entity with id ${id} not found`);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    } as T;

    return this.withTransaction(storeName, 'readwrite', (store) => {
      return new Promise<T>((resolve, reject) => {
        const request = (store as IDBObjectStore).put(updated);
        request.onsuccess = () => resolve(updated);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    return this.withTransaction(storeName, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = (store as IDBObjectStore).delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  // Company methods
  async createCompany(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company> {
    return this.create<Company>('companies', data);
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    return this.update<Company>('companies', id, updates);
  }

  // Seafarer methods
  async createSeafarer(data: Omit<Seafarer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Seafarer> {
    return this.create<Seafarer>('seafarers', data);
  }

  async updateSeafarer(id: string, updates: Partial<Seafarer>): Promise<Seafarer> {
    return this.update<Seafarer>('seafarers', id, updates);
  }

  async getSeafarersByCompany(companyId: string): Promise<Seafarer[]> {
    return this.getByIndex<Seafarer>('seafarers', 'companyId', companyId);
  }

  async getSeafarersByStatus(status: string): Promise<Seafarer[]> {
    return this.getByIndex<Seafarer>('seafarers', 'status', status);
  }

  async getSeafarersByRank(rank: string): Promise<Seafarer[]> {
    return this.getByIndex<Seafarer>('seafarers', 'rank', rank);
  }

  // Vessel methods
  async createVessel(data: Omit<Vessel, 'id' | 'createdAt' | 'updatedAt'>): Promise<Vessel> {
    return this.create<Vessel>('vessels', data);
  }

  async updateVessel(id: string, updates: Partial<Vessel>): Promise<Vessel> {
    return this.update<Vessel>('vessels', id, updates);
  }

  async getVesselsByCompany(companyId: string): Promise<Vessel[]> {
    return this.getByIndex<Vessel>('vessels', 'companyId', companyId);
  }

  // Payroll methods
  async createPayrollRecord(data: Omit<PayrollRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<PayrollRecord> {
    return this.create<PayrollRecord>('payroll', data);
  }

  async getPayrollByCompany(companyId: string): Promise<PayrollRecord[]> {
    return this.getByIndex<PayrollRecord>('payroll', 'companyId', companyId);
  }

  async getPayrollBySeafarer(seafarerId: string): Promise<PayrollRecord[]> {
    return this.getByIndex<PayrollRecord>('payroll', 'seafarerId', seafarerId);
  }

  // Crew assignment methods
  async createCrewAssignment(data: Omit<CrewAssignment, 'id' | 'createdAt' | 'updatedAt'>): Promise<CrewAssignment> {
    return this.create<CrewAssignment>('crew_assignments', data);
  }

  async getCrewAssignmentsByVessel(vesselId: string): Promise<CrewAssignment[]> {
    return this.getByIndex<CrewAssignment>('crew_assignments', 'vesselId', vesselId);
  }

  async getCrewAssignmentsBySeafarer(seafarerId: string): Promise<CrewAssignment[]> {
    return this.getByIndex<CrewAssignment>('crew_assignments', 'seafarerId', seafarerId);
  }

  // Sample data generation
  async generateSampleData(): Promise<void> {
    const companies = await this.getAll<Company>('companies');
    if (companies.length > 0) return; // Already has data

    // Create sample companies
    const sampleCompanies = [
      {
        name: 'Ocean Maritime Holdings',
        code: 'OMH',
        address: {
          street: '123 Harbor Drive',
          city: 'Singapore',
          country: 'Singapore',
          postalCode: '018956'
        },
        contact: {
          email: 'info@oceanmaritime.com',
          phone: '+65 6123 4567',
          website: 'https://oceanmaritime.com'
        },
        settings: {
          currency: 'USD',
          timezone: 'Asia/Singapore',
          fiscalYearStart: '01-01'
        }
      },
      {
        name: 'Pacific Shipping Corporation',
        code: 'PSC',
        address: {
          street: '456 Port Boulevard',
          city: 'Hong Kong',
          country: 'Hong Kong',
          postalCode: '000000'
        },
        contact: {
          email: 'contact@pacificshipping.hk',
          phone: '+852 2345 6789',
          website: 'https://pacificshipping.hk'
        },
        settings: {
          currency: 'USD',
          timezone: 'Asia/Hong_Kong',
          fiscalYearStart: '04-01'
        }
      }
    ];

    const createdCompanies = await Promise.all(
      sampleCompanies.map(company => this.createCompany(company))
    );

    // Create sample vessels for each company
    const sampleVessels = [
      {
        companyId: createdCompanies[0].id,
        name: 'MV Ocean Pride',
        type: 'Container Ship',
        imoNumber: '9123456',
        flag: 'Singapore',
        yearBuilt: 2018,
        grossTonnage: 50000,
        netTonnage: 30000,
        lengthOverall: 200,
        beam: 32,
        draft: 12,
        dwt: 65000,
        portOfRegistry: 'Singapore',
        documents: []
      },
      {
        companyId: createdCompanies[0].id,
        name: 'MV Baltic Star',
        type: 'Bulk Carrier',
        imoNumber: '9123457',
        flag: 'Panama',
        yearBuilt: 2020,
        grossTonnage: 45000,
        netTonnage: 25000,
        lengthOverall: 190,
        beam: 30,
        draft: 11,
        dwt: 60000,
        portOfRegistry: 'Panama',
        documents: []
      },
      {
        companyId: createdCompanies[1].id,
        name: 'MV Pacific Dawn',
        type: 'Tanker',
        imoNumber: '9123458',
        flag: 'Hong Kong',
        yearBuilt: 2019,
        grossTonnage: 55000,
        netTonnage: 35000,
        lengthOverall: 220,
        beam: 35,
        draft: 13,
        dwt: 70000,
        portOfRegistry: 'Hong Kong',
        documents: []
      }
    ];

    await Promise.all(sampleVessels.map(vessel => this.createVessel(vessel)));

    // Create sample seafarers
    const sampleSeafarers = [
      {
        companyId: createdCompanies[0].id,
        personalInfo: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@oceanmaritime.com',
          phone: '+1234567890',
          nationality: 'British',
          dateOfBirth: '1985-03-15',
          passportNumber: 'GB123456789',
          seamanBook: 'SB123456'
        },
        qualifications: {
          rank: 'Captain',
          certificates: [
            {
              id: uuidv4(),
              name: 'STCW Certificate',
              number: 'STCW123456',
              issuedDate: '2020-01-15',
              expiryDate: '2025-01-15',
              issuingAuthority: 'UK MCA'
            }
          ]
        },
        employment: {
          status: 'active' as const,
          currentVessel: 'MV Ocean Pride',
          position: 'Captain',
          contractStart: '2024-01-01',
          contractEnd: '2024-06-30',
          dayOffDue: 45
        },
        financial: {
          bankName: 'HSBC Singapore',
          accountNumber: '123456789',
          iban: 'SG1234567890123456',
          swiftCode: 'HSBCSGSG',
          currency: 'USD',
          basicWage: 12000,
          overtimeRate: 25
        }
      },
      {
        companyId: createdCompanies[0].id,
        personalInfo: {
          firstName: 'Maria',
          lastName: 'Garcia',
          email: 'maria.garcia@oceanmaritime.com',
          phone: '+1234567891',
          nationality: 'Filipino',
          dateOfBirth: '1990-07-22',
          passportNumber: 'PH987654321',
          seamanBook: 'SB789123'
        },
        qualifications: {
          rank: 'Chief Engineer',
          certificates: [
            {
              id: uuidv4(),
              name: 'Engineering Watch Rating',
              number: 'EWR789123',
              issuedDate: '2019-03-10',
              expiryDate: '2024-03-10',
              issuingAuthority: 'MARINA Philippines'
            }
          ]
        },
        employment: {
          status: 'available' as const,
          position: 'Chief Engineer',
          dayOffDue: 30
        },
        financial: {
          bankName: 'BPI Philippines',
          accountNumber: '987654321',
          currency: 'USD',
          basicWage: 8500,
          overtimeRate: 20
        }
      }
    ];

    await Promise.all(sampleSeafarers.map(seafarer => this.createSeafarer(seafarer)));

    console.log('Sample data generated successfully');
  }
}

export const db = SeafarerDatabase.getInstance();