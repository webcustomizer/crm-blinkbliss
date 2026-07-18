// Advanced cache strategy with TTL support

export type CacheStrategy = 'cache-first' | 'network-first' | 'stale-while-revalidate';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

const CACHE_STORE = new Map<string, CacheEntry>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const API_TTL = 10 * 60 * 1000; // 10 minutes for API data

/**
 * Get cached data if valid (not expired)
 */
export function getCached<T>(key: string): T | null {
  const entry = CACHE_STORE.get(key);
  if (!entry) return null;

  const isExpired = Date.now() - entry.timestamp > entry.ttl;
  if (isExpired) {
    CACHE_STORE.delete(key);
    return null;
  }

  return entry.data as T;
}

/**
 * Set cached data with TTL
 */
export function setCached<T>(
  key: string,
  data: T,
  ttl: number = DEFAULT_TTL
): void {
  CACHE_STORE.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Clear specific cache or all cache
 */
export function clearCache(key?: string): void {
  if (key) {
    CACHE_STORE.delete(key);
  } else {
    CACHE_STORE.clear();
  }
}

/**
 * Stale-while-revalidate pattern
 * Returns cached data immediately, then fetches fresh data in background
 */
export async function staleWhileRevalidate<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = API_TTL
): Promise<T> {
  // Return cached data immediately if available
  const cached = getCached<T>(key);
  if (cached) {
    // Fetch fresh data in background without blocking
    fetcher()
      .then((fresh) => setCached(key, fresh, ttl))
      .catch((err) => console.error('Background fetch failed:', err));
    return cached;
  }

  // No cache, fetch fresh data
  const fresh = await fetcher();
  setCached(key, fresh, ttl);
  return fresh;
}

/**
 * Network-first with cache fallback
 */
export async function networkFirst<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = API_TTL
): Promise<T> {
  try {
    const fresh = await fetcher();
    setCached(key, fresh, ttl);
    return fresh;
  } catch (error) {
    const cached = getCached<T>(key);
    if (cached) return cached;
    throw error;
  }
}

/**
 * Cache-first with network update
 */
export async function cacheFirst<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const cached = getCached<T>(key);
  if (cached) return cached;

  const fresh = await fetcher();
  setCached(key, fresh, ttl);
  return fresh;
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats() {
  return {
    size: CACHE_STORE.size,
    entries: Array.from(CACHE_STORE.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl,
      expired: Date.now() - entry.timestamp > entry.ttl,
    })),
  };
}
