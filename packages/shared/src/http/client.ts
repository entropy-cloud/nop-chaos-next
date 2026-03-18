import type { HttpRequestOptions, HttpResponse, HttpRuntime } from './types'
import { resolveRequestUrl } from './url'

const DEFAULT_APP_ID = 'nop-chaos'

function normalizeHeaders(headers: Headers) {
  const normalizedHeaders: Record<string, string> = {}

  headers.forEach((value, key) => {
    normalizedHeaders[key.toLowerCase()] = value
  })

  return normalizedHeaders
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function serializeRequestBody(data: unknown, headers: Headers) {
  if (data == null) {
    return undefined
  }

  if (
    typeof data === 'string' ||
    data instanceof FormData ||
    data instanceof Blob ||
    data instanceof ArrayBuffer ||
    ArrayBuffer.isView(data) ||
    data instanceof URLSearchParams
  ) {
    return data as BodyInit
  }

  if (isPlainObject(data) || Array.isArray(data) || typeof data === 'number' || typeof data === 'boolean') {
    headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json')
    return JSON.stringify(data)
  }

  return data as BodyInit
}

async function parseJsonOrText(text: string) {
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

async function parseResponseBody(response: Response, responseType: HttpRequestOptions['responseType']) {
  if (responseType === 'blob') {
    return response.blob()
  }

  if (responseType === 'text') {
    return response.text()
  }

  const text = await response.text()
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json') || contentType.includes('+json')) {
    return text ? (JSON.parse(text) as unknown) : null
  }

  return parseJsonOrText(text)
}

export function createHttpClient(runtime: HttpRuntime) {
  return {
    async request<T = unknown>(options: HttpRequestOptions): Promise<HttpResponse<T>> {
      const token = runtime.getAuthToken()
      const headers = new Headers({
        Accept: 'application/json',
        'nop-locale': runtime.getLocale(),
        'x-requested-with': 'XMLHttpRequest',
        ...options.headers
      })

      if (options.withAuth !== false && token) {
        headers.set('x-access-token', token)
        headers.set('authorization', `Bearer ${token}`)
        headers.set('x-timestamp', String(Date.now()))
        headers.set('x-tenant-id', headers.get('x-tenant-id') ?? '0')
        headers.set('x-version', headers.get('x-version') ?? 'v3')
        headers.set('nop-app-id', headers.get('nop-app-id') ?? DEFAULT_APP_ID)
      }

      const method = options.method ?? (options.data === undefined ? 'GET' : 'POST')
      const response = await fetch(resolveRequestUrl(options.url, options.query, runtime.getBaseUrl()), {
        method,
        headers,
        signal: options.signal,
        body: method.toUpperCase() === 'GET' ? undefined : serializeRequestBody(options.data, headers)
      })
      const responseToken = response.headers.get('x-access-token')

      if (responseToken) {
        runtime.setAuthToken?.(responseToken)
      }

      if (response.status === 401) {
        runtime.onUnauthorized?.()
      }

      return {
        status: response.status,
        headers: normalizeHeaders(response.headers),
        data: (await parseResponseBody(response, options.responseType)) as T
      }
    }
  }
}
