import type { AmisRequestOptions } from '@nop-chaos/amis-core';
import {
  createHttpClient,
  getAccessToken,
  getRefreshToken as getManagedRefreshToken,
  getValidToken,
  setRefreshTokenFetcher,
  unwrapApiPayload,
} from '@nop-chaos/shared';
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
