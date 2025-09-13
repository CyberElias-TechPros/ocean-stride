import { DB_NAME, DB_VERSION, STORES } from './config';
import { IDBStoreConfig, StoreName } from './types';

class Database {
  private db: IDBDatabase | null = null;
  private static instance: Database;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async init(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log('Database opened successfully');
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        console.log(`Upgrading database to version ${event.newVersion}`);
        const db = (event.target as IDBOpenDBRequest).result;
        this.createStores(db);
      };
    });
  }

  private createStores(db: IDBDatabase): void {
    // Get existing store names
    const existingStores = Array.from(db.objectStoreNames);
    
    // Create or update stores based on config
    Object.values(STORES).forEach((storeConfig: IDBStoreConfig) => {
      if (existingStores.includes(storeConfig.name)) {
        db.deleteObjectStore(storeConfig.name);
      }
      
      const store = db.createObjectStore(
        storeConfig.name,
        storeConfig.options
      );

      // Create indexes
      storeConfig.indexes?.forEach((index) => {
        store.createIndex(index.name, index.keyPath, index.options);
      });
    });
  }

  public async withTransaction<T>(
    storeNames: StoreName | StoreName[],
    mode: IDBTransactionMode,
    callback: (transaction: IDBTransaction) => Promise<T> | T
  ): Promise<T> {
    const db = this.db || (await this.init());
    const storeNamesArray = Array.isArray(storeNames) ? storeNames : [storeNames];
    const transaction = db.transaction(storeNamesArray, mode);
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        // Transaction completed successfully
      };
      
      transaction.onerror = () => {
        reject(transaction.error || new Error('Transaction failed'));
      };
      
      // Execute the callback and resolve with its result
      try {
        const result = callback(transaction);
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

  public async clear(): Promise<void> {
    const db = this.db || (await this.init());
    
    await Promise.all(
      Array.from(db.objectStoreNames).map((storeName) => {
        return new Promise<void>((resolve, reject) => {
          const transaction = db.transaction(storeName, 'readwrite');
          const store = transaction.objectStore(storeName);
          const request = store.clear();
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      })
    );
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const db = Database.getInstance();
