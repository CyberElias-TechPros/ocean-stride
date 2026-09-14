import { v4 as uuidv4 } from 'uuid';
import { STORE_NAMES } from './schemas';
import type { BaseEntity } from './schemas_v2';

class DatabaseService {
  private static instance: DatabaseService;
  private db: IDBDatabase | null = null;
  private readonly dbName = 'OceanStrideDB_v3';
  private readonly version = 5;

  private constructor() {
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason?.name === 'VersionError') {
        console.warn('Caught unhandled VersionError, attempting to recover...');
        event.preventDefault();
        this.handleVersionConflict().catch(console.error);
      }
    });
  }

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
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
        const db = request.result;
        this.createStores(db);
      };
    });
  }

  private async handleVersionConflict(): Promise<void> {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      await new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase(this.dbName);
      
        req.onsuccess = () => {
          console.log(`Successfully deleted database: ${this.dbName}`);
          resolve();
        };
        
        req.onerror = () => {
          console.error('Error deleting database:', req.error);
          resolve();
        };
        
        req.onblocked = () => {
          console.warn('Database is blocked, cannot delete');
          resolve();
        };
      });
    } catch (error) {
      console.error('Error in handleVersionConflict:', error);
    }
  }

  private createStores(db: IDBDatabase): void {
    if (!db.objectStoreNames.contains(STORE_NAMES.COMPANIES)) {
      const store = db.createObjectStore(STORE_NAMES.COMPANIES, { keyPath: 'id' });
      store.createIndex('name', 'name', { unique: true });
    }

    if (!db.objectStoreNames.contains('seafarers')) {
      const store = db.createObjectStore('seafarers', { keyPath: 'id' });
      store.createIndex('by_name', ['lastName', 'firstName']);
      store.createIndex('by_rank', 'rank');
      store.createIndex('by_company', 'companyId');
    }
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) {
      await this.init();
    }
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  
  async getById<T>(storeName: string, id: string): Promise<T | undefined> {
    if (!this.db) {
      await this.init();
    }
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async create<T extends BaseEntity>(
    storeName: string, 
    item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    options?: IDBTransactionOptions
  ): Promise<T> {
    if (!this.db) {
      await this.init();
    }
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    const now = new Date().toISOString();
    const newItem = {
      ...item,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    } as T;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(newItem);
      
      request.onsuccess = () => resolve(newItem);
      request.onerror = () => reject(request.error);
    });
  }

  async update<T extends BaseEntity>(
    storeName: string,
    id: string,
    updates: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<T | undefined> {
    if (!this.db) {
      await this.init();
    }
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const existing = await this.getById<T>(storeName, id);
    if (!existing) return undefined;

    const updatedItem = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(updatedItem);
      
      request.onsuccess = () => resolve(updatedItem);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<boolean> {
    if (!this.db) {
      await this.init();
    }
    
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.error('Error deleting item:', request.error);
        reject(request.error);
      };
    });
  }
}

export const db = DatabaseService.getInstance();
