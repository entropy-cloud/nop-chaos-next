import { createHttpClient } from '@nop-chaos/shared';
import type { HttpRequestOptions } from '@nop-chaos/shared';
import { getAmisRuntimeAdapter } from '../adapter';
import type { AmisRequestOptions } from '../types';

export function getApiBaseUrl() {
  if (import.meta.env?.VITE_USE_API_PROXY === 'true') {
    return '';
  }

  return import.meta.env?.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createAbortSignal(cancelExecutor: AmisRequestOptions['cancelExecutor']) {
  if (!cancelExecutor) {
    return undefined;
  }

  const controller = new AbortController();
  cancelExecutor(() => {
    controller.abort();
  });
  return controller.signal;
}

let client: ReturnType<typeof createHttpClient> | null = null;
let clientAdapter: ReturnType<typeof getAmisRuntimeAdapter> | null = null;

function getClient() {
  const adapter = getAmisRuntimeAdapter();

  if (!client || clientAdapter !== adapter) {
    clientAdapter = adapter;

    client = createHttpClient({
      getBaseUrl: getApiBaseUrl,
      getLocale: () => adapter.getLocale()?.replace('_', '-') || 'zh-CN',
      getAuthToken: () => adapter.getAuthToken(),
      getRefreshToken: () => adapter.getRefreshToken?.(),
      setAuthToken: (token) => {
        if (token) {
          adapter.setAuthToken(token);
        }
      },
      clearTokens: () => {
        adapter.clearTokens?.();
      },
      refreshAccessToken: adapter.refreshAccessToken,
      onUnauthorized: () => {
        adapter.logout('401');
      },
    });
  }

  return client;
}

export async function executeSharedRequest(options: HttpRequestOptions) {
  const adapter = getAmisRuntimeAdapter();

  if (adapter.request) {
    return adapter.request(options);
  }

  return getClient().request(options);
}

export function prepareRequest(options: AmisRequestOptions) {
  const adapter = getAmisRuntimeAdapter();
  const processedRequest = adapter.processRequest ? adapter.processRequest(options) : options;
  const method = processedRequest.method ?? (processedRequest.data === undefined ? 'GET' : 'POST');
  const normalizedMethod = method.toUpperCase();

  return {
    processedRequest,
    method,
    requestData: normalizedMethod === 'GET' ? undefined : processedRequest.data,
    requestQuery:
      normalizedMethod === 'GET'
        ? {
            ...processedRequest.query,
            ...(isPlainObject(processedRequest.data) ? processedRequest.data : {}),
          }
        : processedRequest.query,
    signal: createAbortSignal(processedRequest.cancelExecutor),
  };
}
