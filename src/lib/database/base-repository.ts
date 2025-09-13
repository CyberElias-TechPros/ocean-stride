import { IDBValidKey, IDBStoreConfig, EntityKey, NewEntity } from './types';
import { db } from './database';
import { STORES, StoreName } from './config';

export abstract class BaseRepository<T extends { id: string }> {
  protected abstract readonly storeName: StoreName;
  protected abstract readonly schema: any; // Zod schema for validation

  protected get storeConfig(): IDBStoreConfig {
    return STORES[this.storeName];
  }

  protected validate(data: unknown): T {
    const result = this.schema.safeParse(data);
    if (!result.success) {
      console.error('Validation error:', result.error);
      throw new Error(`Invalid data: ${result.error.message}`);
    }
    return result.data as T;
  }

  protected async getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const database = await db.init();
    const transaction = database.transaction(this.storeName, mode);
    return transaction.objectStore(this.storeName);
  }

  public async getById(id: string): Promise<EntityKey<T> | null> {
    return db.withTransaction(
      this.storeName,
      'readonly',
      (transaction) => {
        return new Promise((resolve, reject) => {
          const store = transaction.objectStore(this.storeName);
          const request = store.get(id);
          
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  public async getAll(): Promise<EntityKey<T>[]> {
    return db.withTransaction(
      this.storeName,
      'readonly',
      (transaction) => {
        return new Promise((resolve, reject) => {
          const store = transaction.objectStore(this.storeName);
          const request = store.getAll();
          
          request.onsuccess = () => resolve(request.result || []);
          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  public async create(data: NewEntity<T>): Promise<EntityKey<T>> {
    const now = new Date().toISOString();
    const newItem = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    } as EntityKey<T>;

    this.validate(newItem);

    return db.withTransaction(
      this.storeName,
      'readwrite',
      (transaction) => {
        return new Promise((resolve, reject) => {
          const store = transaction.objectStore(this.storeName);
          const request = store.add(newItem);
          
          request.onsuccess = () => resolve(newItem);
          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  public async update(id: string, updates: Partial<NewEntity<T>>): Promise<EntityKey<T>> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`${this.storeName} with id ${id} not found`);
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    } as EntityKey<T>;

    this.validate(updated);

    return db.withTransaction(
      this.storeName,
      'readwrite',
      (transaction) => {
        return new Promise((resolve, reject) => {
          const store = transaction.objectStore(this.storeName);
          const request = store.put(updated);
          
          request.onsuccess = () => resolve(updated);
          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  public async delete(id: string): Promise<void> {
    return db.withTransaction(
      this.storeName,
      'readwrite',
      (transaction) => {
        return new Promise((resolve, reject) => {
          const store = transaction.objectStore(this.storeName);
          const request = store.delete(id);
          
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  public async query(
    indexName: string,
    query: IDBValidKey | IDBKeyRange,
    direction: IDBCursorDirection = 'next',
    count?: number
  ): Promise<EntityKey<T>[]> {
    return db.withTransaction(
      this.storeName,
      'readonly',
      (transaction) => {
        return new Promise((resolve, reject) => {
          const store = transaction.objectStore(this.storeName);
          const index = store.index(indexName);
          const request = index.openCursor(query, direction);
          
          const results: EntityKey<T>[] = [];
          
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
            if (cursor) {
              results.push(cursor.value);
              if (count && results.length >= count) {
                resolve(results);
              } else {
                cursor.continue();
              }
            } else {
              resolve(results);
            }
          };
          
          request.onerror = () => reject(request.error);
        });
      }
    );
  }

  public async count(indexName?: string, query?: IDBValidKey | IDBKeyRange): Promise<number> {
    return db.withTransaction(
      this.storeName,
      'readonly',
      (transaction) => {
        return new Promise((resolve, reject) => {
          const store = transaction.objectStore(this.storeName);
          let request: IDBRequest<number>;
          
          if (indexName && query !== undefined) {
            const index = store.index(indexName);
            request = index.count(query);
          } else {
            request = store.count();
          }
          
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      }
    );
  }
}
