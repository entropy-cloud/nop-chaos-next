import type { AmisRequestOptions } from '@nop-chaos/amis-core';
import {
  createHttpClient,
  getAccessToken,
  getRefreshToken as getManagedRefreshToken,
  getValidToken,
  setRefreshTokenFetcher,
  unwrapApiPayload,
} from '@nop-chaos/shared';
import { resolveNopRpcUrl } from './nopRpcResolver';
import i18n from '../config/i18n';
import { normalizeLanguageCode } from '../config/i18n/languages';
import { refreshAccessToken as requestRefreshAccessToken } from './authApi';
import { useAuthStore } from '../store/authStore';

interface AjaxRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  withAuth?: boolean;
  data?: unknown;
  query?: Record<string, unknown>;
  responseType?: 'json' | 'blob' | 'text';
  signal?: AbortSignal;
  silent?: boolean;
}

function getApiBaseUrl() {
  if (import.meta.env.VITE_USE_API_PROXY === 'true') {
    return '';
  }

  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
}

function getLocaleHeader() {
  return normalizeLanguageCode(i18n.language);
}

function syncStoreTokens(
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number,
  refreshExpiresIn?: number,
) {
  useAuthStore.getState().setTokens(accessToken, refreshToken, expiresIn, refreshExpiresIn);
}

async function refreshWithStore(refreshToken: string) {
  const refreshed = await requestRefreshAccessToken(refreshToken);
  syncStoreTokens(
    refreshed.accessToken,
    refreshed.refreshToken ?? refreshToken,
    refreshed.expiresIn,
    refreshed.refreshExpiresIn,
  );
  return refreshed;
}

setRefreshTokenFetcher(refreshWithStore);

export const mainHttpClient = createHttpClient({
  getBaseUrl: getApiBaseUrl,
  getLocale: getLocaleHeader,
  getTimeoutMs: () => 15_000,
  getAuthToken: () => getAccessToken(),
  getRefreshToken: () => getManagedRefreshToken(),
  getValidToken,
  refreshAccessToken: async () => {
    const refreshToken = getManagedRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const refreshed = await refreshWithStore(refreshToken);
    return refreshed.accessToken;
  },
  setAuthToken: (token) => {
    if (token) {
      useAuthStore.getState().setToken(token);
    }
  },
  clearTokens: () => {
    useAuthStore.getState().clearTokens();
  },
  onUnauthorized: () => {
    useAuthStore.getState().logout();
  },
});

async function getAmisRequestTransforms() {
  return import('@nop-chaos/amis-core');
}

async function buildRequestOptions(
  path: string,
  options: AjaxRequestOptions,
): Promise<{ request: AjaxRequestOptions & { url: string }; operationName?: string }> {
  const { data, headers, query, ...requestOptions } = options;
  const { transformGraphQLRequest } = await getAmisRequestTransforms();
  const amisRequest: AmisRequestOptions = {
    method: requestOptions.method,
    url: path,
    headers,
    data,
    query,
  };
  const transformed = transformGraphQLRequest(amisRequest);
  const request = transformed?.request ?? amisRequest;

  return {
    operationName: transformed?.operationName,
    request: {
      ...requestOptions,
      url: request.url,
      method: request.method ?? requestOptions.method ?? 'GET',
      headers: request.headers,
      query: request.query,
      data: request.data,
    },
  };
}

export async function ajaxFetch<T>(path: string, options: AjaxRequestOptions = {}): Promise<T> {
  const { normalizeGraphQLResponse } = await getAmisRequestTransforms();
  const request = await buildRequestOptions(path, options);
  const response = await mainHttpClient.request(request.request);
  const normalizedData = request.operationName
    ? normalizeGraphQLResponse(response.data, request.operationName)
    : response.data;

  if (response.status < 200 || response.status >= 300) {
    const message =
      typeof normalizedData === 'object' &&
      normalizedData !== null &&
      'message' in normalizedData &&
      typeof normalizedData.message === 'string'
        ? normalizedData.message
        : typeof normalizedData === 'string' && normalizedData
          ? normalizedData
          : `Request failed: ${response.status}`;

    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return unwrapApiPayload<T>(normalizedData);
}

export async function ajaxQuery<T>(
  path: string,
  data?: Record<string, unknown>,
  options: Omit<AjaxRequestOptions, 'data'> = {},
): Promise<T> {
  return ajaxFetch<T>(path, {
    ...options,
    method: options.method ?? 'POST',
    data,
  });
}

interface NopRpcRequestOptions {
  url: string;
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

interface NopRpcResponse<T> {
  ok: boolean;
  status: number;
  code?: string;
  msg?: string;
  data: T | null;
  headers: Record<string, string>;
  raw: unknown;
}

/**
 * flux 模式的 RPC 请求：识别 nop 的 @query:/@mutation:/@rpc: 等 url，
 * 统一转换为 /r/{Entity__method} RPC 调用（不走 graphql）。
 * 返回后端 raw envelope {status, code, msg, data}（status 是 RPC 状态码 0/-1，
 * 不是 HTTP status）；flux runtime 会按 status===0 计算 ok，业务控件用 response.data。
 */
export async function nopRpcRequest<T>(options: NopRpcRequestOptions): Promise<NopRpcResponse<T>> {
  const resolution = resolveNopRpcUrl(options.url, options.data);
  if (options.url?.includes('NopAuthUser__save')) {
    // eslint-disable-next-line no-console
    console.log('[nopRpc] save URL:', options.url, 'resolved:', !!resolution, 'data keys:', Object.keys(options.data as object || {}));
  }
  if (resolution) {
    // @query: / @mutation: URL 由 resolveNopRpcUrl 处理
    try {
      const response = await mainHttpClient.request<T>({
        url: resolution.url,
        method: resolution.method,
        data: resolution.data,
        headers: options.headers,
        signal: options.signal,
      });
      if (response.status < 200 || response.status >= 300) {
        const msg = typeof response.data === 'object' && response.data !== null
          ? ((response.data as Record<string, unknown>).msg as string) ?? `Request failed: ${response.status}`
          : `Request failed: ${response.status}`;
        const error = new Error(msg) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }
      const body = response.data as unknown as {
        status?: number;
        code?: string;
        msg?: string;
        data?: unknown;
      };
      const rpcStatus = body.status ?? -1;
      return {
        ok: rpcStatus === 0,
        status: rpcStatus,
        code: body?.code,
        msg: body?.msg,
        data: (body?.data as T | undefined) ?? null,
        headers: response.headers,
        raw: response,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const status = (error as Error & { status?: number }).status ?? 0;
      return { ok: false, status, data: null, headers: {}, raw: error };
    }
  }

  // 非 @query:/@mutation: URL，直接透传
  let url = options.url;
  let method = options.method ?? 'GET';
  try {
    const response = await mainHttpClient.request<T>({
      url, method, data: options.data, headers: options.headers, signal: options.signal,
    });
    const body = response.data as unknown as {
      status?: number;
      code?: string;
      msg?: string;
      data?: unknown;
    };
    const hasEnvelope = body && typeof body === 'object' && 'status' in body;
    const rpcStatus = hasEnvelope ? (body.status ?? -1) : response.status;
    const rpcData = (hasEnvelope ? body.data : body) as T;
    return {
      ok: rpcStatus === 0,
      status: rpcStatus,
      code: body?.code,
      msg: body?.msg,
      data: rpcData,
      headers: response.headers,
      raw: response,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const status = (error as Error & { status?: number }).status ?? 0;
    return { ok: false, status, data: null, headers: {}, raw: error };
  }
}
