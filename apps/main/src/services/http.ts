import { normalizeGraphQLResponse, transformGraphQLRequest } from '@nop-chaos/amis-core'
import type { AmisRequestOptions } from '@nop-chaos/amis-core'
import { createHttpClient, unwrapApiPayload } from '@nop-chaos/shared'
import { useAuthStore } from '../store/authStore'

interface AjaxRequestOptions {
  method?: string
  headers?: Record<string, string>
  withAuth?: boolean
  data?: unknown
  query?: Record<string, unknown>
  responseType?: 'json' | 'blob' | 'text'
  signal?: AbortSignal
  silent?: boolean
}

function getApiBaseUrl() {
  if (import.meta.env.VITE_USE_API_PROXY === 'true') {
    return ''
  }

  return import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? ''
}

function getLocaleHeader() {
  if (typeof document === 'undefined') {
    return 'zh-CN'
  }

  return document.documentElement.lang?.replace('_', '-') || navigator.language || 'zh-CN'
}

export const mainHttpClient = createHttpClient({
  getBaseUrl: getApiBaseUrl,
  getLocale: getLocaleHeader,
  getAuthToken: () => useAuthStore.getState().token,
  setAuthToken: (token) => {
    if (token) {
      useAuthStore.getState().setToken(token)
    }
  },
  onUnauthorized: () => {
    useAuthStore.getState().logout()
  }
})

function buildRequestOptions(path: string, options: AjaxRequestOptions): { request: AjaxRequestOptions & { url: string }; operationName?: string } {
  const { data, headers, query, silent: _silent, ...requestOptions } = options
  const amisRequest: AmisRequestOptions = {
    method: requestOptions.method,
    url: path,
    headers,
    data,
    query
  }
  const transformed = transformGraphQLRequest(amisRequest)
  const request = transformed?.request ?? amisRequest

  return {
    operationName: transformed?.operationName,
    request: {
      ...requestOptions,
      url: request.url,
      method: request.method ?? requestOptions.method ?? 'GET',
      headers: request.headers,
      query: request.query,
      data: request.data
    }
  }
}

export async function ajaxFetch<T>(path: string, options: AjaxRequestOptions = {}): Promise<T> {
  const request = buildRequestOptions(path, options)
  const response = await mainHttpClient.request(request.request)
  const normalizedData = request.operationName ? normalizeGraphQLResponse(response.data, request.operationName) : response.data

  if (response.status < 200 || response.status >= 300) {
    const message =
      typeof normalizedData === 'object' && normalizedData !== null && 'message' in normalizedData && typeof normalizedData.message === 'string'
        ? normalizedData.message
        : typeof normalizedData === 'string' && normalizedData
          ? normalizedData
          : `Request failed: ${response.status}`

    const error = new Error(message) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  return unwrapApiPayload<T>(normalizedData)
}

export async function ajaxQuery<T>(path: string, data?: Record<string, unknown>, options: Omit<AjaxRequestOptions, 'data'> = {}): Promise<T> {
  return ajaxFetch<T>(path, {
    ...options,
    method: options.method ?? 'POST',
    data
  })
}
