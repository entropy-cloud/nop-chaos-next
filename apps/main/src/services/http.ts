import type { AmisRequestOptions } from '@nop-chaos/amis-core';
import {
  createHttpClient,
  getAccessToken,
  getRefreshToken as getManagedRefreshToken,
  getValidToken,
  isApiPayload,
  setRefreshTokenFetcher,
  unwrapApiPayload,
} from '@nop-chaos/shared';
import { resolveNopRpcUrl } from './nopRpcResolver';
import { normalizeBlobData } from './httpBlob';
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
  selection?: string;
  responseType?: 'json' | 'blob' | 'text';
  downloadFileName?: string;
}

interface NopRpcResponse<T> {
  ok: boolean;
  status: number;
  code?: string;
  msg?: string;
  data: T | null;
  errors?: Record<string, string>;
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
  const resolution = resolveNopRpcUrl(options.url, options.data, options.selection);
  if (resolution) {
    // @query: / @mutation: URL 由 resolveNopRpcUrl 处理
    try {
      const response = await mainHttpClient.request<T>({
        url: resolution.url,
        method: resolution.method,
        data: resolution.data,
        headers: options.headers,
        signal: options.signal,
        responseType: options.responseType,
      });
      if (response.status < 200 || response.status >= 300) {
        if (isApiPayload(response.data)) {
          const errorEnvelope = response.data as {
            status?: number;
            code?: string;
            msg?: string;
            data?: unknown;
            errors?: Record<string, string>;
          };
          const errorStatus = Number(errorEnvelope.status ?? -1);
          return {
            ok: errorStatus === 0,
            status: errorStatus,
            code: errorEnvelope.code,
            msg: errorEnvelope.msg,
            data: (errorEnvelope.data as T | undefined) ?? null,
            errors: errorEnvelope.errors,
            headers: response.headers,
            raw: response,
          };
        }
        const msg = typeof response.data === 'object' && response.data !== null
          ? ((response.data as Record<string, unknown>).msg as string) ?? `Request failed: ${response.status}`
          : `Request failed: ${response.status}`;
        const error = new Error(msg) as Error & { status?: number };
        error.status = response.status;
        throw error;
      }

      let body = response.data as unknown;
      if (options.responseType === 'blob' && body instanceof Blob) {
        const blobResult = await normalizeBlobData(body, {
          downloadFileName: options.downloadFileName,
          headers: response.headers,
        });
        if (blobResult instanceof Blob) {
          return {
            ok: true,
            status: 0,
            data: blobResult as T,
            headers: response.headers,
            raw: response,
          };
        }
        body = blobResult;
      }

      const envelope = body as {
        status?: number;
        code?: string;
        msg?: string;
        data?: unknown;
        errors?: Record<string, string>;
      };
      const rpcStatus = envelope.status ?? -1;
      return {
        ok: rpcStatus === 0,
        status: rpcStatus,
        code: envelope?.code,
        msg: envelope?.msg,
        data: (envelope?.data as T | undefined) ?? null,
        errors: envelope?.errors,
        headers: response.headers,
        raw: response,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return { ok: false, status: -1, data: null, headers: {}, raw: error };
    }
  }

  // 非 @query:/@mutation: URL，直接透传
  const url = options.url;
  const method = options.method ?? 'GET';
  try {
    const response = await mainHttpClient.request<T>({
      url, method, data: options.data, headers: options.headers, signal: options.signal,
    });
    const body = response.data as unknown as {
      status?: number;
      code?: string;
      msg?: string;
      data?: unknown;
      errors?: Record<string, string>;
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
      errors: body?.errors,
      headers: response.headers,
      raw: response,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { ok: false, status: -1, data: null, headers: {}, raw: error };
  }
}
