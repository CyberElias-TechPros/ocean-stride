import { v4 as uuidv4 } from 'uuid';
import {
  type BaseEntity,
  type Company,
  type Vessel,
  type Seafarer,
  type CrewAssignment,
  type Payroll,
  type Document,
  type Notification,
  type Certificate,
  type Rank,
  type PayrollSettings,
  type CompanySettings,
} from './schemas_v2';
import { type Applicant, type CrewChange, type SystemSettings } from './schemas';
import { STORE_NAMES, INDEX_NAMES } from './schemas';
import { getAuthToken } from './auth';

/**
 * Centralized data service used by the whole application.
 *
 * The service has two transports:
 *  - IndexedDB (offline/local demo, works with zero setup)
 *  - A Cloudflare Worker REST API (production; enabled when VITE_API_BASE_URL is set)
 *
 * Every page/component keeps calling the same methods, so switching between
 * the local and remote transports does not require any UI changes.
 */
interface RemoteRecord {
  id: string;
  store: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

const REMOTE_STORES = new Set<string>(Object.values(STORE_NAMES));

// Fields managed automatically by the data layer.  `companyId` is intentionally
// NOT included here: it is a business key that callers must still supply.
type ManagedEntityFields =
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'createdBy'
  | 'updatedBy';

type CreateInput<T> = Omit<T, ManagedEntityFields>;
type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt' | 'createdBy'>>;

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function remoteBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return configured ? stripTrailingSlash(configured) : '';
}

/**
 * Whether the app should use the Cloudflare backend instead of the browser
 * IndexedDB.  Production always targets the Worker; IndexedDB is only used
 * when a local-only installation explicitly opts into it with
 * `VITE_REMOTE_DB=false`.
 */
export function isRemoteEnabled(): boolean {
  return import.meta.env.VITE_REMOTE_DB !== 'false';
}

function isStoreRemoteAllowed(storeName: string): boolean {
  return REMOTE_STORES.has(storeName);
}

function buildUrl(path: string): string {
  const base = remoteBaseUrl();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

async function remoteRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(buildUrl(path), {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      message = body.error || body.message || message;
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function remoteListUrl(storeName: string, indexName?: string, value?: unknown): string {
  const params = new URLSearchParams();
  if (indexName) params.set('index', indexName);
  if (value !== undefined) params.set('value', String(value));
  const qs = params.toString();
  return `/api/db/${encodeURIComponent(storeName)}${qs ? `?${qs}` : ''}`;
}

function getByPath(record: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, record);
}

function normalizeIndexValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (/^(true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (/^(\[|\{)\s*[^\]}]+\s*(\]|\})$/.test(trimmed)) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db: IDBDatabase | null = null;
  private readonly dbName = 'OceanStrideDB_v2';
  private readonly version = 5;
  private readonly stores: string[] = [
    STORE_NAMES.COMPANIES,
    STORE_NAMES.VESSELS,
    STORE_NAMES.SEAFARERS,
    STORE_NAMES.CREW_CHANGES,
    STORE_NAMES.CREW_ASSIGNMENTS,
    STORE_NAMES.PAYROLLS,
    STORE_NAMES.DOCUMENTS,
    STORE_NAMES.NOTIFICATIONS,
    STORE_NAMES.APPLICANTS,
    STORE_NAMES.CERTIFICATES,
    STORE_NAMES.RANKS,
    STORE_NAMES.PAYROLL_SETTINGS,
    STORE_NAMES.COMPANY_SETTINGS,
    'crewChanges',
    'crewAssignments',
    'crew_assignments',
    'payrollSettings',
    'companySettings',
    'job_postings',
    'system_settings',
  ];

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        if ((event.reason as { name?: string })?.name === 'VersionError') {
          event.preventDefault();
          this.handleVersionConflict().catch(console.error);
        }
      });
    }
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

  async init(): Promise<void> {
    if (isRemoteEnabled()) return;
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      request.onerror = () => {
        if (request.error?.name === 'VersionError') {
          this.handleVersionConflict().then(() => this.init()).then(resolve).catch(reject);
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
        this.createStores(db);
      };
    });
  }

  private async handleVersionConflict(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    await new Promise<void>((resolve) => {
      const req = indexedDB.deleteDatabase(this.dbName);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  }

  private createStores(db: IDBDatabase) {
    const indexPaths: Record<string, Array<{ name: string; path: string | string[]; unique?: boolean }>> = {
      [STORE_NAMES.COMPANIES]: [
        { name: INDEX_NAMES.COMPANY_BY_NAME, path: 'name', unique: true },
        { name: 'by_code', path: 'code' },
        { name: 'by_company', path: 'id' },
      ],
      [STORE_NAMES.VESSELS]: [
        { name: INDEX_NAMES.VESSEL_BY_NAME, path: 'name' },
        { name: INDEX_NAMES.VESSEL_BY_IMO, path: 'imoNumber', unique: true },
        { name: INDEX_NAMES.VESSEL_BY_STATUS, path: 'status' },
        { name: INDEX_NAMES.VESSEL_BY_COMPANY, path: 'companyId' },
      ],
      [STORE_NAMES.SEAFARERS]: [
        { name: INDEX_NAMES.SEAFARER_BY_NAME, path: ['personalInfo.lastName', 'personalInfo.firstName'] },
        { name: INDEX_NAMES.SEAFARER_BY_RANK, path: 'employment.rank' },
        { name: 'by_rankId', path: 'employment.rankId' },
        { name: INDEX_NAMES.SEAFARER_BY_STATUS, path: 'employment.status' },
        { name: INDEX_NAMES.SEAFARER_BY_VESSEL, path: 'employment.currentVesselId' },
        { name: INDEX_NAMES.SEAFARER_BY_COMPANY, path: 'companyId' },
      ],
      [STORE_NAMES.CREW_CHANGES]: [
        { name: INDEX_NAMES.CREW_CHANGE_BY_VESSEL, path: 'vesselId' },
        { name: INDEX_NAMES.CREW_CHANGE_BY_DATE, path: 'scheduledDate' },
        { name: INDEX_NAMES.CREW_CHANGE_BY_STATUS, path: 'status' },
        { name: 'by_company', path: 'companyId' },
      ],
      [STORE_NAMES.CREW_ASSIGNMENTS]: [
        { name: INDEX_NAMES.CREW_ASSIGNMENT_BY_SEAFARER, path: 'seafarerId' },
        { name: INDEX_NAMES.CREW_ASSIGNMENT_BY_VESSEL, path: 'vesselId' },
        { name: INDEX_NAMES.CREW_ASSIGNMENT_BY_STATUS, path: 'status' },
        { name: INDEX_NAMES.CREW_ASSIGNMENT_BY_DATE_RANGE, path: ['startDate', 'endDate'] },
        { name: 'by_company', path: 'companyId' },
      ],
      [STORE_NAMES.PAYROLLS]: [
        { name: INDEX_NAMES.PAYROLL_BY_SEAFARER, path: 'seafarerId' },
        { name: INDEX_NAMES.PAYROLL_BY_VESSEL, path: 'vesselId' },
        { name: INDEX_NAMES.PAYROLL_BY_PERIOD, path: ['periodStart', 'periodEnd'] },
        { name: INDEX_NAMES.PAYROLL_BY_STATUS, path: 'status' },
        { name: 'by_company', path: 'companyId' },
      ],
      [STORE_NAMES.DOCUMENTS]: [
        { name: INDEX_NAMES.DOCUMENT_BY_TYPE, path: 'type' },
        { name: INDEX_NAMES.DOCUMENT_BY_ENTITY, path: ['relatedTo.entityType', 'relatedTo.entityId'] },
        { name: INDEX_NAMES.DOCUMENT_BY_EXPIRY, path: 'expiryDate' },
        { name: 'by_company', path: 'companyId' },
      ],
      [STORE_NAMES.NOTIFICATIONS]: [
        { name: INDEX_NAMES.NOTIFICATION_BY_READ_STATUS, path: 'read' },
        { name: INDEX_NAMES.NOTIFICATION_BY_DATE, path: 'createdAt' },
        { name: INDEX_NAMES.NOTIFICATION_BY_TYPE, path: 'type' },
        { name: 'by_company', path: 'companyId' },
      ],
      [STORE_NAMES.APPLICANTS]: [
        { name: INDEX_NAMES.APPLICANT_BY_COMPANY, path: 'companyId' },
        { name: INDEX_NAMES.APPLICANT_BY_STATUS, path: 'application.status' },
        { name: INDEX_NAMES.APPLICANT_BY_POSITION, path: 'application.position' },
      ],
      [STORE_NAMES.CERTIFICATES]: [
        { name: INDEX_NAMES.CERTIFICATE_BY_SEAFARER, path: 'seafarerId' },
        { name: INDEX_NAMES.CERTIFICATE_BY_TYPE, path: 'type' },
        { name: INDEX_NAMES.CERTIFICATE_BY_STATUS, path: 'status' },
        { name: INDEX_NAMES.CERTIFICATE_BY_EXPIRY, path: 'expiryDate' },
        { name: 'by_company', path: 'companyId' },
      ],
      [STORE_NAMES.RANKS]: [
        { name: INDEX_NAMES.RANK_BY_COMPANY, path: 'companyId' },
        { name: INDEX_NAMES.RANK_BY_DEPARTMENT, path: 'department' },
        { name: 'by_name', path: 'name' },
      ],
      [STORE_NAMES.PAYROLL_SETTINGS]: [
        { name: INDEX_NAMES.PAYROLL_SETTINGS_BY_COMPANY, path: 'companyId', unique: true },
      ],
      [STORE_NAMES.COMPANY_SETTINGS]: [
        { name: INDEX_NAMES.COMPANY_SETTINGS_BY_COMPANY, path: 'companyId', unique: true },
      ],
      job_postings: [{ name: 'by_company', path: 'companyId' }, { name: 'by_status', path: 'status' }],
      system_settings: [{ name: 'by_company', path: 'companyId' }],
    };

    for (const storeName of this.stores) {
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(storeName)) {
        store = db.createObjectStore(storeName, { keyPath: 'id' });
      } else {
        store = db.transaction(storeName, 'readwrite').objectStore(storeName);
      }
      const indexes = indexPaths[storeName] ?? [];
      for (const index of indexes) {
        try {
          if (!store.indexNames.contains(index.name)) {
            store.createIndex(index.name, index.path, { unique: index.unique ?? false });
          }
        } catch {
          // Index may already exist from an older schema version; ignore.
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------
  private async withTransaction<T>(
    storeNames: string | string[],
    mode: IDBTransactionMode,
    callback: (tx: IDBTransaction) => Promise<T> | T,
  ): Promise<T> {
    if (!this.db) throw new Error('Database not initialized. Call init() first.');
    const tx = this.db.transaction(storeNames, mode);
    return new Promise<T>((resolve, reject) => {
      tx.onerror = () => reject(tx.error);
      try {
        const result = callback(tx);
        if (result instanceof Promise) result.then(resolve).catch(reject);
        else resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  private async addTimestamps(entity: Record<string, unknown>): Promise<Record<string, unknown>> {
    const now = new Date().toISOString();
    return {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: now,
    };
  }

  private async remoteCreate<T>(storeName: string, data: Record<string, unknown>): Promise<T> {
    const entity = await this.addTimestamps(data);
    return remoteRequest<T>(`/api/db/${encodeURIComponent(storeName)}`, {
      method: 'POST',
      body: JSON.stringify({ data: entity }),
    });
  }

  // --------------------------------------------------------------------------
  // Create
  // --------------------------------------------------------------------------
  async create<T extends BaseEntity = BaseEntity>(
    storeName: string,
    data: unknown,
  ): Promise<T> {
    if (isRemoteEnabled() && isStoreRemoteAllowed(storeName)) {
      return this.remoteCreate<T>(storeName, data as unknown as Record<string, unknown>);
    }
    return this.withTransaction(storeName, 'readwrite', async (tx) => {
      const store = tx.objectStore(storeName);
      const entity = await this.addTimestamps(data as unknown as Record<string, unknown>);
      await new Promise<void>((resolve, reject) => {
        const request = store.add(entity);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      return entity as T;
    });
  }

  async add<T extends BaseEntity = BaseEntity>(
    storeName: string,
    data: unknown,
  ): Promise<T> {
    return this.create<T>(storeName, data);
  }

  // --------------------------------------------------------------------------
  // Reads
  // --------------------------------------------------------------------------
  async get<T extends BaseEntity = BaseEntity>(storeName: string, id: string): Promise<T | null> {
    if (!id) return null;
    if (isRemoteEnabled() && isStoreRemoteAllowed(storeName)) {
      try {
        return await remoteRequest<T>(`/api/db/${encodeURIComponent(storeName)}/${encodeURIComponent(id)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.toLowerCase().includes('not found')) return null;
        throw error;
      }
    }
    return this.getById<T>(storeName, id);
  }

  async getById<T extends BaseEntity = BaseEntity>(storeName: string, id: string): Promise<T | null> {
    if (!id) return null;
    if (isRemoteEnabled() && isStoreRemoteAllowed(storeName)) {
      try {
        return await remoteRequest<T>(`/api/db/${encodeURIComponent(storeName)}/${encodeURIComponent(id)}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.toLowerCase().includes('not found')) return null;
        throw error;
      }
    }
    try {
      return await this.withTransaction<T | null>(storeName, 'readonly', (tx) => {
        const request = tx.objectStore(storeName).get(id);
        return new Promise<T | null>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      });
    } catch {
      return null;
    }
  }

  async getAll<T extends BaseEntity = BaseEntity>(storeName: string): Promise<T[]> {
    if (isRemoteEnabled() && isStoreRemoteAllowed(storeName)) {
      const result = await remoteRequest<{ items: T[] }>(remoteListUrl(storeName));
      return result.items;
    }
    return this.withTransaction(storeName, 'readonly', (tx) => {
      const store = tx.objectStore(storeName);
      return new Promise<T[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getByIndex<T extends BaseEntity = BaseEntity>(
    storeName: string,
    indexName: string,
    value: unknown,
  ): Promise<T[]> {
    if (isRemoteEnabled() && isStoreRemoteAllowed(storeName)) {
      const result = await remoteRequest<{ items: T[] }>(remoteListUrl(storeName, indexName, value));
      return result.items;
    }
    return this.withTransaction(storeName, 'readonly', (tx) => {
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      return new Promise<T[]>((resolve, reject) => {
        const request = index.getAll(value as IDBValidKey);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getByIndexRange<T extends BaseEntity = BaseEntity>(
    storeName: string,
    indexName: string,
    range: IDBKeyRange,
  ): Promise<T[]> {
    if (isRemoteEnabled() && isStoreRemoteAllowed(storeName)) {
      const items = await this.getAll<T>(storeName);
      return items;
    }
    return this.withTransaction(storeName, 'readonly', (tx) => {
      const index = tx.objectStore(storeName).index(indexName);
      return new Promise<T[]>((resolve, reject) => {
        const request = index.getAll(range);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async getByCompoundIndex<T extends BaseEntity = BaseEntity>(
    storeName: string,
    indexName: string,
    values: unknown[],
  ): Promise<T[]> {
    return this.getByIndex<T>(storeName, indexName, values as IDBValidKey);
  }

  async getByKeyRange<T extends BaseEntity = BaseEntity>(
    storeName: string,
    range: IDBKeyRange,
  ): Promise<T[]> {
    if (isRemoteEnabled() && isStoreRemoteAllowed(storeName)) {
      return this.getAll<T>(storeName);
    }
    return this.withTransaction(storeName, 'readonly', (tx) => {
      const store = tx.objectStore(storeName);
      const request = store.getAll(range);
      return new Promise<T[]>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async count(storeName: string, indexName?: string, key?: unknown): Promise<number> {
    if (isRemoteEnabled() && isStoreRemoteAllowed(storeName)) {
      return (await this.getAll(storeName)).length;
    }
    return this.withTransaction(storeName, 'readonly', (tx) => {
      const store = tx.objectStore(storeName);
      const target = indexName ? store.index(indexName) : store;
      const request = key !== undefined ? target.count(key as IDBValidKey) : target.count();
      return new Promise<number>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  }

  // --------------------------------------------------------------------------
  // Update / Delete / Clear
  // --------------------------------------------------------------------------
  async update<T extends BaseEntity = BaseEntity>(
    storeName: string,
    id: string,
    updates: unknown,
  ): Promise<T> {
    if (isRemoteEnabled() && isStoreRemoteAllowed(storeName)) {
      return remoteRequest<T>(`/api/db/${encodeURIComponent(storeName)}/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ data: updates }),
      });
    }
    return this.withTransaction(storeName, 'readwrite', async (tx) => {
      const store = tx.objectStore(storeName);
      const existing = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result as Record<string, unknown>);
        request.onerror = () => reject(request.error);
      });
      if (!existing) throw new Error(`${storeName} with id ${id} not found`);
      const updated = {
        ...existing,
        ...(updates as Record<string, unknown>),
        updatedAt: new Date().toISOString(),
      };
      await new Promise<void>((resolve, reject) => {
        const request = store.put(updated);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      return updated as T;
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    if (isRemoteEnabled() && isStoreRemoteAllowed(storeName)) {
      await remoteRequest(`/api/db/${encodeURIComponent(storeName)}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return;
    }
    return this.withTransaction(storeName, 'readwrite', (tx) => {
      const store = tx.objectStore(storeName);
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  async clear(storeName: string): Promise<void> {
    if (isRemoteEnabled() && isStoreRemoteAllowed(storeName)) {
      const items = await this.getAll(storeName);
      await Promise.all(items.map((item) => this.delete(storeName, (item as { id: string }).id)));
      return;
    }
    return this.withTransaction(storeName, 'readwrite', (tx) => {
      const request = tx.objectStore(storeName).clear();
      return new Promise<void>((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  }

  // --------------------------------------------------------------------------
  // Company
  // --------------------------------------------------------------------------
  async createCompany(data: CreateInput<Company>): Promise<Company> {
    return this.create<Company>(STORE_NAMES.COMPANIES, data);
  }
  async getCompany(id: string): Promise<Company | null> {
    return this.getById<Company>(STORE_NAMES.COMPANIES, id);
  }
  async updateCompany(id: string, updates: Partial<CreateInput<Company>>): Promise<Company> {
    return this.update<Company>(STORE_NAMES.COMPANIES, id, updates);
  }
  async deleteCompany(id: string): Promise<void> {
    return this.delete(STORE_NAMES.COMPANIES, id);
  }

  // --------------------------------------------------------------------------
  // Vessel
  // --------------------------------------------------------------------------
  async createVessel(data: CreateInput<Vessel>): Promise<Vessel> {
    return this.create<Vessel>(STORE_NAMES.VESSELS, data);
  }
  async getVessel(id: string): Promise<Vessel | null> {
    return this.getById<Vessel>(STORE_NAMES.VESSELS, id);
  }
  async getVesselsByCompany(companyId: string): Promise<Vessel[]> {
    return this.getByIndex<Vessel>(STORE_NAMES.VESSELS, INDEX_NAMES.VESSEL_BY_COMPANY, companyId);
  }

  // --------------------------------------------------------------------------
  // Seafarer
  // --------------------------------------------------------------------------
  async createSeafarer(data: CreateInput<Seafarer>): Promise<Seafarer> {
    return this.create<Seafarer>(STORE_NAMES.SEAFARERS, data);
  }
  async getSeafarer(id: string): Promise<Seafarer | null> {
    return this.getById<Seafarer>(STORE_NAMES.SEAFARERS, id);
  }
  async getSeafarersByCompany(companyId: string): Promise<Seafarer[]> {
    return this.getByIndex<Seafarer>(STORE_NAMES.SEAFARERS, INDEX_NAMES.SEAFARER_BY_COMPANY, companyId);
  }

  // --------------------------------------------------------------------------
  // Crew changes / assignments
  // --------------------------------------------------------------------------
  async createCrewChange(data: CreateInput<CrewChange>): Promise<CrewChange> {
    return this.create<CrewChange>(STORE_NAMES.CREW_CHANGES, data);
  }
  async createCrewAssignment(data: CreateInput<CrewAssignment>): Promise<CrewAssignment> {
    return this.create<CrewAssignment>(STORE_NAMES.CREW_ASSIGNMENTS, data);
  }
  async getActiveCrewAssignments(vesselId: string): Promise<CrewAssignment[]> {
    const now = new Date().toISOString();
    const assignments = await this.getByIndex<CrewAssignment>(
      STORE_NAMES.CREW_ASSIGNMENTS,
      INDEX_NAMES.CREW_ASSIGNMENT_BY_VESSEL,
      vesselId,
    );
    return assignments.filter(
      (a) =>
        a.status === 'active' &&
        (!a.startDate || a.startDate <= now) &&
        (!a.endDate || a.endDate >= now),
    );
  }

  // --------------------------------------------------------------------------
  // Payroll
  // --------------------------------------------------------------------------
  async createPayroll(data: CreateInput<Payroll>): Promise<Payroll> {
    return this.create<Payroll>(STORE_NAMES.PAYROLLS, data);
  }

  // --------------------------------------------------------------------------
  // Documents / certificates
  // --------------------------------------------------------------------------
  async createDocument(data: CreateInput<Document>): Promise<Document> {
    return this.create<Document>(STORE_NAMES.DOCUMENTS, data);
  }
  async createCertificate(data: CreateInput<Certificate>): Promise<Certificate> {
    return this.create<Certificate>(STORE_NAMES.CERTIFICATES, data);
  }
  async getExpiringCertificates(days = 30): Promise<Certificate[]> {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const certificates = await this.getAll<Certificate>(STORE_NAMES.CERTIFICATES);
    return certificates.filter((cert) => {
      if (!cert.expiryDate) return false;
      const expiry = new Date(cert.expiryDate);
      return expiry >= now && expiry <= thresholdDate;
    });
  }

  // --------------------------------------------------------------------------
  // Notifications
  // --------------------------------------------------------------------------
  async createNotification(data: CreateInput<Notification>): Promise<Notification> {
    return this.create<Notification>(STORE_NAMES.NOTIFICATIONS, {
      ...data,
      read: false,
    });
  }
  async getUnreadNotifications(companyId: string): Promise<Notification[]> {
    const notifications = await this.getByIndex<Notification>(
      STORE_NAMES.NOTIFICATIONS,
      INDEX_NAMES.NOTIFICATION_BY_READ_STATUS,
      false,
    );
    return notifications.filter((n) => n.companyId === companyId);
  }
  async markNotificationAsRead(id: string): Promise<void> {
    await this.update<Notification>(STORE_NAMES.NOTIFICATIONS, id, { read: true });
  }

  // --------------------------------------------------------------------------
  // Applicants
  // --------------------------------------------------------------------------
  async createApplicant(data: CreateInput<Applicant>): Promise<Applicant> {
    return this.create<Applicant>(STORE_NAMES.APPLICANTS, data);
  }
  async getApplicantsByCompany(companyId: string): Promise<Applicant[]> {
    return this.getByIndex<Applicant>(STORE_NAMES.APPLICANTS, INDEX_NAMES.APPLICANT_BY_COMPANY, companyId);
  }
  async updateApplicant(id: string, updates: Partial<CreateInput<Applicant>>): Promise<Applicant> {
    return this.update<Applicant>(STORE_NAMES.APPLICANTS, id, updates);
  }
  async deleteApplicant(id: string): Promise<void> {
    return this.delete(STORE_NAMES.APPLICANTS, id);
  }

  // --------------------------------------------------------------------------
  // Ranks
  // --------------------------------------------------------------------------
  async createRank(data: CreateInput<Rank>): Promise<Rank> {
    return this.create<Rank>(STORE_NAMES.RANKS, data);
  }

  // --------------------------------------------------------------------------
  // Settings
  // --------------------------------------------------------------------------
  async createSystemSettings(data: CreateInput<SystemSettings>): Promise<SystemSettings> {
    return this.create<SystemSettings>('system_settings', data);
  }
  async getSystemSettings(companyId: string): Promise<SystemSettings | null> {
    const settings = await this.getByIndex<SystemSettings>('system_settings', 'by_company', companyId);
    return settings.length > 0 ? settings[0] : null;
  }
  async updateSystemSettings(id: string, updates: Partial<CreateInput<SystemSettings>>): Promise<SystemSettings> {
    return this.update<SystemSettings>('system_settings', id, updates);
  }
  async deleteSystemSettings(id: string): Promise<void> {
    return this.delete('system_settings', id);
  }
  async createCompanySettings(data: CreateInput<CompanySettings>): Promise<CompanySettings> {
    return this.create<CompanySettings>(STORE_NAMES.COMPANY_SETTINGS, data);
  }
  async getCompanySettings(companyId: string): Promise<CompanySettings> {
    const settings = await this.getByIndex<CompanySettings>(
      STORE_NAMES.COMPANY_SETTINGS,
      INDEX_NAMES.COMPANY_SETTINGS_BY_COMPANY,
      companyId,
    );
    if (settings.length > 0) return settings[0];
    const defaultSettings: CreateInput<CompanySettings> = {
      companyId,
      dateFormat: 'YYYY-MM-DD',
      timezone: 'UTC',
      currency: 'USD',
      fiscalYearStart: '01-01',
      workingHoursPerWeek: 48,
      defaultVesselRotationDays: 30,
      defaultLeaveDays: 30,
      notificationSettings: {
        certificateExpiryWarnings: 30,
        contractExpiry: 30,
        emailNotifications: true,
        sendSMS: false,
        pushNotifications: false,
      },
      documentSettings: {
        requiredCertificates: [],
        documentExpiryWarningDays: 60,
      },
      leavePolicy: {
        annualLeaveDays: 30,
        sickLeaveDays: 15,
        maternityLeaveWeeks: 12,
        paternityLeaveDays: 5,
      },
    };
    return this.create(STORE_NAMES.COMPANY_SETTINGS, defaultSettings);
  }
  async createPayrollSettings(data: CreateInput<PayrollSettings>): Promise<PayrollSettings> {
    return this.create<PayrollSettings>(STORE_NAMES.PAYROLL_SETTINGS, data);
  }
}

/** The default singleton used across the application. */
export const db = DatabaseService.getInstance();

/**
 * Legacy alias used by code that previously imported the v2 class.
 * It is the same singleton, so all transports and data remain consistent.
 */
export const DatabaseServiceV2 = DatabaseService;

/**
 * Generic remote record helper used only by the API-driven paths.
 * Kept internal but exported for the worker-side docs and type reuse.
 */
export type { RemoteRecord };
