import { isMockEnabled } from '../../config/env';

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
  const raw = memoryOnly ? memoryStore.get(key) ?? null : readFromLocalStorage(key);
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
    writeToLocalStorage(key, json);
  }
}

function readFromLocalStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToLocalStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
}
