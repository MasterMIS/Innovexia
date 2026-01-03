// Simple in-memory cache for Google Sheets data
// This dramatically improves performance by avoiding repeated Google Sheets API calls

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>>;

  constructor() {
    this.cache = new Map();
  }

  // Get data from cache if not expired
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  // Set data in cache with TTL
  set<T>(key: string, data: T, ttl: number = 30000): void {
    // Default TTL: 30 seconds
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  // Invalidate specific cache key
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  // Invalidate all cache keys matching a pattern
  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }
}

// Export singleton instance
export const cache = new SimpleCache();

// Helper to generate cache keys
export function generateCacheKey(prefix: string, params?: Record<string, any>): string {
  if (!params) return prefix;
  const paramStr = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');
  return `${prefix}:${paramStr}`;
}
