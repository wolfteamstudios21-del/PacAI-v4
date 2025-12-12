interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 500;

export function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);

  if (!entry) {
    return undefined;
  }

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }

  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  if (cache.size >= MAX_CACHE_SIZE) {
    evictExpired();

    if (cache.size >= MAX_CACHE_SIZE) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) {
        cache.delete(oldestKey);
      }
    }
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function invalidateCache(keyPattern?: string): number {
  if (!keyPattern) {
    const size = cache.size;
    cache.clear();
    return size;
  }

  let count = 0;
  for (const key of cache.keys()) {
    if (key.includes(keyPattern)) {
      cache.delete(key);
      count++;
    }
  }
  return count;
}

export function getCacheStats(): {
  size: number;
  maxSize: number;
  hitRate: string;
} {
  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    hitRate: "N/A",
  };
}

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
}

export function createCacheKey(...parts: (string | number | boolean | undefined)[]): string {
  return parts
    .filter((p) => p !== undefined)
    .map((p) => String(p).toLowerCase().trim())
    .join("::");
}

setInterval(() => {
  evictExpired();
}, 5 * 60 * 1000);
