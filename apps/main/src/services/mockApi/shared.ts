import { APP_STORAGE_KEYS } from '../../constants/storage';
import { isMockEnabled } from '../../config/env';
import { getStorageItem, setStorageItem } from '../../utils/storage';

const mockEnabled = isMockEnabled();
const memoryOnly = import.meta.env.VITE_MOCK_MEMORY_ONLY === 'true';
const memoryStore = new Map<string, string>();

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function wait<T>(value: T, ms = 240): Promise<T> {
  return new Promise((resolve) => {
    globalThis.setTimeout(() => resolve(value), mockEnabled ? ms : 0);
  });
}

export function readStoredJson<T>(key: string, fallback: T): T {
  const raw = memoryOnly ? memoryStore.get(key) ?? null : readFromStorage(key);
  if (!raw) {
    return clone(fallback);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return clone(fallback);
  }
}

export function writeStoredJson<T>(key: string, value: T): void {
  const json = JSON.stringify(value);
  if (memoryOnly) {
    memoryStore.set(key, json);
  } else {
    writeToStorage(key, json);
  }
}

function resolveStorageScope(key: string) {
  return key === APP_STORAGE_KEYS.auth ? 'session' : 'local';
}

function readFromStorage(key: string): string | null {
  try {
    return getStorageItem(key, resolveStorageScope(key));
  } catch {
    return null;
  }
}

function writeToStorage(key: string, value: string): void {
  try {
    setStorageItem(key, value, resolveStorageScope(key));
  } catch {
    return;
  }
}
