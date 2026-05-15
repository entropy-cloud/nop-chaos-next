import { DEFAULT_STORAGE_SCOPE } from '../constants/storage';

const storageCache = new Map<string, string | null>();

type StorageScope = 'local' | 'session';

function resolveStorage(scope: StorageScope = DEFAULT_STORAGE_SCOPE) {
  return scope === 'session' ? window.sessionStorage : window.localStorage;
}

export function getStorageItem(key: string, scope: StorageScope = DEFAULT_STORAGE_SCOPE): string | null {
  const cacheKey = `${scope}:${key}`;
  if (storageCache.has(cacheKey)) {
    return storageCache.get(cacheKey) ?? null;
  }

  try {
    const value = resolveStorage(scope).getItem(key);
    storageCache.set(cacheKey, value);
    return value;
  } catch {
    return null;
  }
}

export function setStorageItem(
  key: string,
  value: string,
  scope: StorageScope = DEFAULT_STORAGE_SCOPE,
): void {
  const cacheKey = `${scope}:${key}`;
  try {
    resolveStorage(scope).setItem(key, value);
    storageCache.set(cacheKey, value);
  } catch {
    return;
  }
}

export function removeStorageItem(key: string, scope: StorageScope = DEFAULT_STORAGE_SCOPE): void {
  const cacheKey = `${scope}:${key}`;
  try {
    resolveStorage(scope).removeItem(key);
    storageCache.delete(cacheKey);
  } catch {
    return;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key) {
      storageCache.delete(`local:${event.key}`);
      storageCache.delete(`session:${event.key}`);
    }
  });
}
