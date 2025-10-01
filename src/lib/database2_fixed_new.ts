import { v4 as uuidv4 } from 'uuid';
import { STORE_NAMES } from './schemas';
import type { BaseEntity } from './schemas_v2';

interface IDBTransactionOptions {
  durability?: 'default' | 'strict' | 'relaxed';
  readOnly?: boolean;
}

class DatabaseService {
  private static instance: DatabaseService;
  private db: IDBDatabase | null = null;
  private readonly dbName = 'OceanStrideDB_v3';
  private readonly version = 5; // Increment this when making schema changes
  private isInitialized = false;
  private pendingOperations: Array<() => void> = [];

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
    if (this.isInitialized && this.db) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = (event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        console.error('Database error:', error);
        reject(error);
      };

      request.onblocked = () => {
        const message = 'Database is blocked, please close other tabs with this app open';
        console.warn(message);
        reject(new Error(message));
      };

      request.onsuccess = (e) => {
        const target = e.target as IDBOpenDBRequest;
        this.db = target.result as IDBDatabase;
        this.isInitialized = true;
        
        // Process any pending operations
        this.processPendingOperations();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        // Handle database upgrades
        this.handleUpgrade(db, oldVersion, this.version);
      };
    });
  }

  private async handleVersionConflict(): Promise<void> {
    console.warn('Handling version conflict...');
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }

      await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(this.dbName);
      
        req.onsuccess = () => {
          console.log(`Successfully deleted database: ${this.dbName}`);
          this.isInitialized = false;
          this.pendingOperations = [];
          resolve();
        };
        
        req.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          console.error('Error deleting database:', error);
          reject(error);
        };
        
        req.onblocked = () => {
          console.warn('Database is blocked, cannot delete');
          reject(new Error('Database is blocked'));
        };
      });
      
      // Reinitialize the database after deletion
      await this.init();
    } catch (error) {
      console.error('Error in handleVersionConflict:', error);
      throw error;
    }
  }
  
  private handleUpgrade(db: IDBDatabase, oldVersion: number, newVersion: number): void {
    console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
    
    // Create or upgrade object stores based on version
    if (oldVersion < 1) {
      // Initial version
      this.createStores(db);
    }
    
    // Add more version-specific migrations here
    // Example:
    // if (oldVersion < 2) {
    //   // Migration for version 2
    //   if (!db.objectStoreNames.contains('newStore')) {
    //     db.createObjectStore('newStore', { keyPath: 'id' });
    //   }
    // }
    
    // Always ensure all stores exist
    this.createStores(db);
  }
  
  private queueOperation<T>(
    operation: () => Promise<T>,
    options: { retryOnFailure?: boolean } = { retryOnFailure: true }
  ): Promise<T> {
    // If already initialized and we have a database connection, execute immediately
    if (this.isInitialized && this.db) {
      return operation();
    }
    
    return new Promise((resolve, reject) => {
      const executeOperation = async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          // If retry is enabled and we're not initialized, try to initialize and retry once
          if (options.retryOnFailure && !this.isInitialized) {
            try {
              await this.init();
              const result = await operation();
              resolve(result);
            } catch (retryError) {
              console.error('Retry operation failed:', retryError);
              reject(retryError);
            }
          } else {
            console.error('Operation failed:', error);
            reject(error);
          }
        }
      };
      
      this.pendingOperations.push(executeOperation);
      
      if (!this.isInitialized) {
        this.init().catch(reject);
      }
    });
  }
  
  private processPendingOperations(): void {
    if (!this.isInitialized || !this.db) return;
    
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];
    
    operations.forEach(op => {
      try {
        op();
      } catch (error) {
        console.error('Error processing queued operation:', error);
      }
    });
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
    return this.queueOperation(async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
    
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          console.error(`Error in getAll for store ${storeName}:`, error);
          reject(error);
        };
      });
    });
  }
  
  async getById<T>(storeName: string, id: string): Promise<T | undefined> {
    return this.queueOperation(async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(id);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          console.error(`Error in getById for store ${storeName}:`, error);
          reject(error);
        };
      });
    });
  }
  
  async create<T extends BaseEntity>(
    storeName: string, 
    item: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    transactionOptions: IDBTransactionOptions = {}
  ): Promise<T> {
    return this.queueOperation(async () => {
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
        // Apply transaction options if provided
        const transaction = this.db!.transaction(
          [storeName], 
          'readwrite',
          transactionOptions
        );
        const store = transaction.objectStore(storeName);
        const request = store.add(newItem);
        
        request.onsuccess = () => resolve(newItem);
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          console.error(`Error creating item in store ${storeName}:`, error);
          reject(error);
        };
        
        // Handle transaction completion
        transaction.oncomplete = () => {
          // Transaction completed successfully
        };
        
        transaction.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          console.error(`Transaction error in store ${storeName}:`, error);
          reject(error);
        };
      });
    });
  }

  async update<T extends BaseEntity>(
    storeName: string,
    id: string,
    updates: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<T | undefined> {
    return this.queueOperation(async () => {
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
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          console.error(`Error updating item in store ${storeName}:`, error);
          reject(error);
        };
      });
    });
  }

  async delete(storeName: string, id: string): Promise<boolean> {
    return this.queueOperation(async () => {
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve(true);
        request.onerror = (event) => {
          const error = (event.target as IDBRequest).error;
          console.error(`Error deleting item from store ${storeName}:`, error);
          reject(error);
        };
      });
    });
  }
}

export const db = DatabaseService.getInstance();
