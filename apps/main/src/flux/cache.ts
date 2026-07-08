function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/* ─── Page Cache (LRU) ─────────────────────────────────────── */

const PAGE_CACHE_MAX = 50;

interface PageCacheEntry {
  state: 'pending' | 'resolved';
  pendingPromise?: Promise<unknown>;
  value?: unknown;
}

const pageStore = new Map<string, PageCacheEntry>();

function pageCacheKey(locale: string, path: string): string {
  return `${locale}|${path}`;
}

function trimPageCache() {
  while (pageStore.size > PAGE_CACHE_MAX) {
    const oldestKey = pageStore.keys().next().value;
    if (oldestKey === undefined) return;
    pageStore.delete(oldestKey);
  }
}

export function readPageCache<T>(key: string):
  | { kind: 'resolved'; value: T }
  | { kind: 'pending'; promise: Promise<T> }
  | { kind: 'miss' } {
  const entry = pageStore.get(key);
  if (!entry) return { kind: 'miss' };
  pageStore.delete(key);
  pageStore.set(key, entry);
  if (entry.state === 'pending') {
    return { kind: 'pending', promise: entry.pendingPromise as Promise<T> };
  }
  return { kind: 'resolved', value: entry.value as T };
}

export function setPageCachePending<T>(key: string, promise: Promise<T>): Promise<T> {
  const entry: PageCacheEntry = { state: 'pending', pendingPromise: promise };
  pageStore.set(key, entry);
  trimPageCache();
  return promise.then(
    (value) => {
      const resolved = pageStore.get(key);
      if (resolved === entry) {
        pageStore.set(key, { state: 'resolved', value });
      }
      return value;
    },
    (error) => {
      const resolved = pageStore.get(key);
      if (resolved === entry) {
        pageStore.delete(key);
      }
      throw error;
    },
  );
}

export function clearFluxPageCache(): void {
  pageStore.clear();
}

export function withPageCache<T>(
  locale: string,
  path: string,
  loader: () => Promise<T>,
): Promise<T> {
  const key = pageCacheKey(locale, path);
  const hit = readPageCache<T>(key);
  if (hit.kind === 'resolved') return Promise.resolve(clone(hit.value));
  if (hit.kind === 'pending') return hit.promise.then(clone);
  return setPageCachePending(key, loader()).then(clone);
}

/* ─── Dict Cache (TTL) ─────────────────────────────────────── */

const DICT_CACHE_TTL_MS = 20_000;

interface DictCacheEntry {
  state: 'pending' | 'resolved';
  pendingPromise?: Promise<unknown>;
  value?: unknown;
  expiresAt?: number;
}

const dictStore = new Map<string, DictCacheEntry>();

function dictCacheKey(locale: string, name: string): string {
  return `${locale}|${name}`;
}

export function clearFluxDictCache(): void {
  dictStore.clear();
}

export function withDictCache<T>(
  locale: string,
  name: string,
  loader: () => Promise<T>,
): Promise<T> {
  const key = dictCacheKey(locale, name);
  const entry = dictStore.get(key);
  const now = Date.now();

  if (entry) {
    if (entry.state === 'pending') {
      return entry.pendingPromise as Promise<T>;
    }
    if (entry.expiresAt && entry.expiresAt > now) {
      return Promise.resolve(clone(entry.value as T));
    }
    dictStore.delete(key);
  }

  const promise = loader();
  dictStore.set(key, { state: 'pending', pendingPromise: promise });

  return promise.then(
    (value) => {
      const resolved = dictStore.get(key);
      if (resolved && resolved.state === 'pending') {
        dictStore.set(key, {
          state: 'resolved',
          value,
          expiresAt: Date.now() + DICT_CACHE_TTL_MS,
        });
      }
      return clone(value);
    },
    (error) => {
      const resolved = dictStore.get(key);
      if (resolved && resolved.state === 'pending') {
        dictStore.delete(key);
      }
      throw error;
    },
  );
}
