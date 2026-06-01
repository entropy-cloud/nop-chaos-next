import { isMockEnabled } from '../config/env';
import i18n from '../config/i18n';
import { normalizeLanguageCode } from '../config/i18n/languages';
import { ajaxFetch, ajaxQuery } from './http';
import { loadSchemaAsset } from './schemaAsset';

const PAGE_CACHE_MAX = 50;
const pageCache = new Map<string, Promise<unknown>>();

function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function getPageCacheKey(schemaPath: string) {
  return `${normalizeLanguageCode(i18n.language)}|${schemaPath}`;
}

function trimPageCache() {
  while (pageCache.size > PAGE_CACHE_MAX) {
    const oldestKey = pageCache.keys().next().value;
    if (!oldestKey) {
      return;
    }
    pageCache.delete(oldestKey);
  }
}

function withPageCache<T>(schemaPath: string, loader: () => Promise<T>): Promise<T> {
  const cacheKey = getPageCacheKey(schemaPath);
  const cached = pageCache.get(cacheKey);
  if (cached) {
    return cached.then((value) => cloneValue(value as T));
  }

  const pending = loader()
    .then((value) => {
      pageCache.delete(cacheKey);
      pageCache.set(cacheKey, Promise.resolve(value));
      trimPageCache();
      return value;
    })
    .catch((error: unknown) => {
      pageCache.delete(cacheKey);
      throw error;
    });

  pageCache.set(cacheKey, pending);
  trimPageCache();
  return pending.then((value) => cloneValue(value));
}

export function clearAmisPageCache() {
  pageCache.clear();
}

export async function fetchAmisPage(schemaPath: string) {
  if (isMockEnabled() || schemaPath.startsWith('/mock') || schemaPath.endsWith('.json')) {
    return withPageCache(schemaPath, () => loadSchemaAsset(schemaPath));
  }

  if (schemaPath.startsWith('/p/')) {
    return withPageCache(schemaPath, () =>
      ajaxFetch<unknown>(schemaPath, {
        method: 'GET',
      }),
    );
  }

  return withPageCache(schemaPath, () =>
    ajaxQuery<unknown>('@query:PageProvider__getPage', {
      path: schemaPath,
    }),
  );
}
