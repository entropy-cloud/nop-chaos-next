// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { getStorageItem, removeStorageItem, setStorageItem } from './storage';

function createStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

describe('storage scope contract', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: createStorageMock(),
    });
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createStorageMock(),
    });
  });

  it('keeps auth data in session storage when session scope is requested', () => {
    setStorageItem('auth:v2', 'session-token', 'session');

    expect(getStorageItem('auth:v2', 'session')).toBe('session-token');
    expect(sessionStorage.getItem('auth:v2')).toBe('session-token');
    expect(localStorage.getItem('auth:v2')).toBeNull();
  });

  it('removes the targeted scoped value', () => {
    setStorageItem('plugin-state', 'local-value', 'local');
    removeStorageItem('plugin-state', 'local');

    expect(getStorageItem('plugin-state', 'local')).toBeNull();
  });
});
