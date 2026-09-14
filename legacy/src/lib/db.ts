import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { STORE_NAMES } from './constants';
import { Company, Vessel, Seafarer, Assignment, Payroll, Certificate, Rank } from './schemas_v2';

interface OceanStrideDB extends DBSchema {
  [STORE_NAMES.COMPANIES]: {
    key: string;
    value: Company;
    indexes: { 'by_name': string };
  };
  [STORE_NAMES.VESSELS]: {
    key: string;
    value: Vessel;
    indexes: { 
      'by_name': string;
      'by_imo': string;
      'by_company': string;
    };
  };
  [STORE_NAMES.SEAFARERS]: {
    key: string;
    value: Seafarer;
    indexes: { 
      'by_name': string;
      'by_rank': string;
      'by_company': string;
      'by_vessel': string;
    };
  };
  [STORE_NAMES.CREW_ASSIGNMENTS]: {
    key: string;
    value: Assignment;
    indexes: {
      'by_seafarer': string;
      'by_vessel': string;
      'by_status': string;
      'by_date_range': [string, string];
    };
  };
  [STORE_NAMES.PAYROLLS]: {
    key: string;
    value: Payroll;
    indexes: {
      'by_seafarer': string;
      'by_vessel': string;
      'by_company': string;
      'by_date_range': [string, string];
    };
  };
  [STORE_NAMES.CERTIFICATES]: {
    key: string;
    value: Certificate;
    indexes: {
      'by_seafarer': string;
      'by_type': string;
      'by_status': string;
      'by_expiry': Date;
    };
  };
  [STORE_NAMES.RANKS]: {
    key: string;
    value: Rank;
    indexes: {
      'by_company': string;
      'by_department': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<OceanStrideDB>>;

export const db = {
  async getDb() {
    if (!dbPromise) {
      dbPromise = openDB<OceanStrideDB>('ocean-stride', 1, {
        upgrade(db) {
          // Create stores and indexes
          if (!db.objectStoreNames.contains(STORE_NAMES.COMPANIES)) {
            const companyStore = db.createObjectStore(STORE_NAMES.COMPANIES, { keyPath: 'id' });
            companyStore.createIndex('by_name', 'name', { unique: true });
          }

          if (!db.objectStoreNames.contains(STORE_NAMES.VESSELS)) {
            const vesselStore = db.createObjectStore(STORE_NAMES.VESSELS, { keyPath: 'id' });
            vesselStore.createIndex('by_name', 'name');
            vesselStore.createIndex('by_imo', 'imoNumber', { unique: true });
            vesselStore.createIndex('by_company', 'companyId');
          }

          if (!db.objectStoreNames.contains(STORE_NAMES.SEAFARERS)) {
            const seafarerStore = db.createObjectStore(STORE_NAMES.SEAFARERS, { keyPath: 'id' });
            seafarerStore.createIndex('by_name', ['personalInfo.lastName', 'personalInfo.firstName']);
            seafarerStore.createIndex('by_rank', 'employment.rankId');
            seafarerStore.createIndex('by_company', 'employment.companyId');
            seafarerStore.createIndex('by_vessel', 'employment.currentVesselId');
          }

          if (!db.objectStoreNames.contains(STORE_NAMES.CREW_ASSIGNMENTS)) {
            const assignmentStore = db.createObjectStore(STORE_NAMES.CREW_ASSIGNMENTS, { keyPath: 'id' });
            assignmentStore.createIndex('by_seafarer', 'seafarerId');
            assignmentStore.createIndex('by_vessel', 'vesselId');
            assignmentStore.createIndex('by_status', 'status');
            assignmentStore.createIndex('by_date_range', ['startDate', 'endDate']);
          }

          if (!db.objectStoreNames.contains(STORE_NAMES.PAYROLLS)) {
            const payrollStore = db.createObjectStore(STORE_NAMES.PAYROLLS, { keyPath: 'id' });
            payrollStore.createIndex('by_seafarer', 'seafarerId');
            payrollStore.createIndex('by_vessel', 'vesselId');
            payrollStore.createIndex('by_company', 'companyId');
            payrollStore.createIndex('by_date_range', ['periodStart', 'periodEnd']);
          }

          if (!db.objectStoreNames.contains(STORE_NAMES.CERTIFICATES)) {
            const certStore = db.createObjectStore(STORE_NAMES.CERTIFICATES, { keyPath: 'id' });
            certStore.createIndex('by_seafarer', 'seafarerId');
            certStore.createIndex('by_type', 'type');
            certStore.createIndex('by_status', 'status');
            certStore.createIndex('by_expiry', 'expiryDate');
          }

          if (!db.objectStoreNames.contains(STORE_NAMES.RANKS)) {
            const rankStore = db.createObjectStore(STORE_NAMES.RANKS, { keyPath: 'id' });
            rankStore.createIndex('by_company', 'companyId');
            rankStore.createIndex('by_department', 'department');
          }
        },
      });
    }
    return dbPromise;
  },

  // CRUD operations for all stores
  async getAll(storeName: string) {
    const db = await this.getDb();
    return db.getAll(storeName);
  },

  async get(storeName: string, key: string) {
    const db = await this.getDb();
    return db.get(storeName, key);
  },

  async add(storeName: string, value: any) {
    const db = await this.getDb();
    return db.add(storeName, value);
  },

  async update(storeName: string, key: string, value: any) {
    const db = await this.getDb();
    return db.put(storeName, { ...value, id: key });
  },

  async delete(storeName: string, key: string) {
    const db = await this.getDb();
    return db.delete(storeName, key);
  },

  async getByIndex(storeName: string, indexName: string, value: any) {
    const db = await this.getDb();
    return db.getAllFromIndex(storeName, indexName, value);
  },
};
