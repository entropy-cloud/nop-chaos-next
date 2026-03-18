export interface HttpRuntime {
  getBaseUrl: () => string
  getLocale: () => string
  getAuthToken: () => string | undefined
  setAuthToken?: (token?: string) => void
  onUnauthorized?: () => void
}

export interface HttpRequestOptions {
  method?: string
  url: string
  query?: Record<string, unknown>
  data?: unknown
  headers?: Record<string, string>
  withAuth?: boolean
  responseType?: 'json' | 'blob' | 'text'
  signal?: AbortSignal
}

export interface HttpResponse<T = unknown> {
  status: number
  data: T
  headers: Record<string, string>
}
