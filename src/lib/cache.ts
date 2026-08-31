// Caching strategies for client-side data management

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  strategy: 'LRU' | 'LFU' | 'FIFO';
}

class Cache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>(); // For LRU
  private accessCount = new Map<string, number>(); // For LFU
  private insertionOrder: string[] = []; // For FIFO

  constructor(private config: CacheConfig) {}

  set(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    };

    // Remove existing entry if present
    this.delete(key);

    // Check if we need to evict
    if (this.cache.size >= this.config.maxSize) {
      this.evict();
    }

    this.cache.set(key, entry);
    this.insertionOrder.push(key);

    if (this.config.strategy === 'LRU') {
      this.accessOrder.set(key, Date.now());
    } else if (this.config.strategy === 'LFU') {
      this.accessCount.set(key, 0);
    }
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    // Update access patterns
    if (this.config.strategy === 'LRU') {
      this.accessOrder.set(key, Date.now());
    } else if (this.config.strategy === 'LFU') {
      this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder.delete(key);
      this.accessCount.delete(key);
      const index = this.insertionOrder.indexOf(key);
      if (index > -1) {
        this.insertionOrder.splice(index, 1);
      }
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCount.clear();
    this.insertionOrder = [];
  }

  size(): number {
    // Clean expired entries
    this.cleanup();
    return this.cache.size;
  }

  private evict(): void {
    let keyToEvict: string | null = null;

    switch (this.config.strategy) {
      case 'LRU': {
        let oldestAccess = Date.now();
        for (const [key, accessTime] of this.accessOrder) {
          if (accessTime < oldestAccess) {
            oldestAccess = accessTime;
            keyToEvict = key;
          }
        }
        break;
      }
      case 'LFU': {
        let lowestCount = Infinity;
        for (const [key, count] of this.accessCount) {
          if (count < lowestCount) {
            lowestCount = count;
            keyToEvict = key;
          }
        }
        break;
      }
      case 'FIFO':
        keyToEvict = this.insertionOrder[0];
        break;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }
}

// API Response Cache
class ApiCache {
  private cache = new Cache<any>({
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
    strategy: 'LRU',
  });

  set(endpoint: string, params: Record<string, any>, data: any, ttl?: number): void {
    const key = this.generateKey(endpoint, params);
    this.cache.set(key, data, ttl);
  }

  get(endpoint: string, params: Record<string, any>): any | null {
    const key = this.generateKey(endpoint, params);
    return this.cache.get(key);
  }

  has(endpoint: string, params: Record<string, any>): boolean {
    const key = this.generateKey(endpoint, params);
    return this.cache.has(key);
  }

  invalidate(endpoint: string, params?: Record<string, any>): void {
    if (params) {
      const key = this.generateKey(endpoint, params);
      this.cache.delete(key);
    } else {
      // Invalidate all keys matching the endpoint pattern
      const keysToDelete: string[] = [];
      for (const key of this.cache['cache'].keys()) {
        if (key.startsWith(`${endpoint}:`)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.cache.delete(key));
    }
  }

  clear(): void {
    this.cache.clear();
  }

  private generateKey(endpoint: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${endpoint}:${sortedParams}`;
  }
}

// Database Query Cache
class QueryCache {
  private cache = new Cache<any>({
    defaultTTL: 10 * 60 * 1000, // 10 minutes
    maxSize: 50,
    strategy: 'LRU',
  });

  set(storeName: string, query: string, params: any[], data: any): void {
    const key = `${storeName}:${query}:${JSON.stringify(params)}`;
    this.cache.set(key, data);
  }

  get(storeName: string, query: string, params: any[]): any | null {
    const key = `${storeName}:${query}:${JSON.stringify(params)}`;
    return this.cache.get(key);
  }

  has(storeName: string, query: string, params: any[]): boolean {
    const key = `${storeName}:${query}:${JSON.stringify(params)}`;
    return this.cache.has(key);
  }

  invalidateStore(storeName: string): void {
    // Invalidate all queries for a specific store
    const keysToDelete: string[] = [];
    for (const key of this.cache['cache'].keys()) {
      if (key.startsWith(`${storeName}:`)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  clear(): void {
    this.cache.clear();
  }
}

// Image and Asset Cache
class AssetCache {
  private cache = new Map<string, { blob: Blob; timestamp: number; ttl: number }>();

  async set(url: string, ttl: number = 24 * 60 * 60 * 1000): Promise<void> { // 24 hours default
    try {
      const response = await fetch(url);
      if (!response.ok) return;

      const blob = await response.blob();
      this.cache.set(url, {
        blob,
        timestamp: Date.now(),
        ttl,
      });
    } catch (error) {
      console.warn('Failed to cache asset:', url, error);
    }
  }

  get(url: string): string | null {
    const entry = this.cache.get(url);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(url);
      return null;
    }

    return URL.createObjectURL(entry.blob);
  }

  has(url: string): boolean {
    const entry = this.cache.get(url);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(url);
      return false;
    }

    return true;
  }

  clear(): void {
    // Revoke object URLs to prevent memory leaks
    for (const entry of this.cache.values()) {
      URL.revokeObjectURL(URL.createObjectURL(entry.blob));
    }
    this.cache.clear();
  }
}

// Performance monitoring for cache operations
interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
}

class CacheMetricsCollector {
  private metrics = new Map<string, CacheMetrics>();

  recordHit(cacheName: string): void {
    const metric = this.metrics.get(cacheName) || { hits: 0, misses: 0, evictions: 0, size: 0 };
    metric.hits++;
    this.metrics.set(cacheName, metric);
  }

  recordMiss(cacheName: string): void {
    const metric = this.metrics.get(cacheName) || { hits: 0, misses: 0, evictions: 0, size: 0 };
    metric.misses++;
    this.metrics.set(cacheName, metric);
  }

  recordEviction(cacheName: string): void {
    const metric = this.metrics.get(cacheName) || { hits: 0, misses: 0, evictions: 0, size: 0 };
    metric.evictions++;
    this.metrics.set(cacheName, metric);
  }

  updateSize(cacheName: string, size: number): void {
    const metric = this.metrics.get(cacheName) || { hits: 0, misses: 0, evictions: 0, size: 0 };
    metric.size = size;
    this.metrics.set(cacheName, metric);
  }

  getMetrics(cacheName: string): CacheMetrics | null {
    return this.metrics.get(cacheName) || null;
  }

  getHitRate(cacheName: string): number {
    const metric = this.metrics.get(cacheName);
    if (!metric) return 0;

    const total = metric.hits + metric.misses;
    return total > 0 ? metric.hits / total : 0;
  }

  getAllMetrics(): Record<string, CacheMetrics> {
    return Object.fromEntries(this.metrics);
  }

  clear(): void {
    this.metrics.clear();
  }
}

// Global cache instances
export const apiCache = new ApiCache();
export const queryCache = new QueryCache();
export const assetCache = new AssetCache();
export const cacheMetrics = new CacheMetricsCollector();

// Cache utilities
export const preloadAssets = async (urls: string[]): Promise<void> => {
  const promises = urls.map(url => assetCache.set(url));
  await Promise.allSettled(promises);
};

export const warmupCache = async (endpoints: Array<{ url: string; params?: Record<string, any> }>): Promise<void> => {
  const promises = endpoints.map(({ url, params = {} }) =>
    fetch(url, { method: 'GET' })
      .then(response => response.json())
      .then(data => apiCache.set(url, params, data))
      .catch(error => console.warn('Failed to warmup cache for:', url, error))
  );
  await Promise.allSettled(promises);
};

// Cache invalidation strategies
export const invalidateUserData = (): void => {
  // Invalidate user-related caches
  apiCache.invalidate('/api/user');
  apiCache.invalidate('/api/profile');
  queryCache.invalidateStore('seafarers');
};

export const invalidateCompanyData = (companyId: string): void => {
  // Invalidate company-related caches
  apiCache.invalidate('/api/company');
  queryCache.invalidateStore('companies');
  queryCache.invalidateStore('vessels');
  queryCache.invalidateStore('seafarers');
  queryCache.invalidateStore('payroll');
};

// Memory management
export const cleanupCaches = (): void => {
  // Clear expired entries and manage memory
  apiCache.clear();
  queryCache.clear();
  assetCache.clear();
  cacheMetrics.clear();
};

// Periodic cleanup
if (typeof window !== 'undefined') {
  setInterval(cleanupCaches, 30 * 60 * 1000); // Clean up every 30 minutes
}