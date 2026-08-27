import { isMockEnabled } from '../config/env';
import i18n from '../config/i18n';
import { normalizeLanguageCode } from '../config/i18n/languages';
import { ajaxFetch, nopRpcRequest } from './http';
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

// 通用页面 schema 获取：三段式后端逻辑（mock/JSON → /p/ 直连 → PageProvider__getPage RPC）。
// amis 和 flux provider 共用；后端在 -Dnop.web.render-mode=flux 时通过同一条路径返回 flux 格式 schema。
// flux 模式（fetchFluxPage 调用方）走 nopRpcRequest（/r/ REST），不走 GraphQL。
export async function fetchPageSchema(
  schemaPath: string,
  signal?: AbortSignal,
): Promise<unknown> {
  if (isMockEnabled() || schemaPath.startsWith('/mock') || schemaPath.endsWith('.json')) {
    return loadSchemaAsset(schemaPath, { signal });
  }

  if (schemaPath.startsWith('/p/')) {
    return ajaxFetch<unknown>(schemaPath, { method: 'GET', signal });
  }

  const resp = await nopRpcRequest<unknown>({
    url: '@query:PageProvider__getPage',
    data: { path: schemaPath },
    signal,
  });
  if (resp.status !== 0) {
    throw new Error(resp.msg ?? '页面加载失败');
  }
  return resp.data;
}

export async function fetchAmisPage(schemaPath: string) {
  return withPageCache(schemaPath, () => fetchPageSchema(schemaPath));
}
