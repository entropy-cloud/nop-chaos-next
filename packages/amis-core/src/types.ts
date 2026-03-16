import type { ThemeConfig, User } from '@nop-chaos/shared'
import type { i18n } from 'i18next'

export type AmisToastType = 'info' | 'success' | 'error' | 'warning'

export interface AmisRequestOptions {
  method?: string
  url: string
  query?: Record<string, unknown>
  data?: unknown
  headers?: Record<string, string>
  responseType?: 'json' | 'blob'
  silent?: boolean
  rawResponse?: boolean
  _page?: AmisPageObject
}

export interface AmisFetcherResult<T = unknown> {
  status: number
  data: T
  headers?: Record<string, string>
}

export interface AmisPageProvider {
  getPage: (schemaPath: string) => Promise<unknown>
}

export interface AmisDictProvider {
  getDict: (dictName: string, options: AmisRequestOptions) => Promise<AmisFetcherResult>
}

export interface AmisPageObject {
  id: string
  schemaPath?: string
  registerAction: (name: string, action: Function) => void
  getAction: (name: string) => Function | undefined
  resetActions: () => void
  getComponent: (name: string) => unknown
  getScopedStore: (name: string) => unknown
  getState: (name: string) => unknown
  setState: (name: string, value: unknown) => void
  destroy: () => void
}

export interface AmisRuntimeAdapter {
  getI18n: () => i18n
  getLocale: () => string
  getCurrentUser: () => User | null
  getAuthToken: () => string | undefined
  setAuthToken: (token?: string) => void
  hasRole: (role: string) => boolean
  getThemeConfig: () => ThemeConfig
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void
  isCurrentUrl: (to: string) => boolean
  notify: (type: AmisToastType, message: string) => void
  alert: (message: string, title?: string) => Promise<void>
  confirm: (message: string, title?: string) => Promise<boolean>
  logout: (reason: string) => void
  pageProvider: AmisPageProvider
  dictProvider: AmisDictProvider
  processRequest?: (request: AmisRequestOptions) => AmisRequestOptions
  processResponse?: <T>(response: Promise<T>) => Promise<T>
  resolveAction?: (name: string, page: AmisPageObject) => Function | undefined
  compileFunction?: (code: string, page: AmisPageObject) => Function
}

export type AmisSchemaRecord = Record<string, unknown>

export interface ProcessSchemaOptions {
  onObject?: (value: AmisSchemaRecord) => Promise<AmisSchemaRecord | null | undefined> | AmisSchemaRecord | null | undefined
}
