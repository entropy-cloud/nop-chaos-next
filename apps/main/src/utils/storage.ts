const storageCache = new Map<string, string | null>();

export function getStorageItem(key: string): string | null {
  if (storageCache.has(key)) {
    return storageCache.get(key) ?? null;
  }

  try {
    const value = window.localStorage.getItem(key);
    storageCache.set(key, value);
    return value;
  } catch {
    return null;
  }
}

export function setStorageItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
    storageCache.set(key, value);
  } catch {
    return;
  }
}

export function removeStorageItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
    storageCache.delete(key);
  } catch {
    return;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key) {
      storageCache.delete(event.key);
    }
  });
}
