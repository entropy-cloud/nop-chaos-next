import type { HttpRequestOptions, HttpResponse, ThemeConfig, User } from '@nop-chaos/shared';

export interface AmisI18nLike {
  language: string;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export type AmisToastType = 'info' | 'success' | 'error' | 'warning';
export type AmisAction = (...args: unknown[]) => unknown;

export interface AmisRequestOptions {
  method?: string;
  url: string;
  query?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  responseType?: 'json' | 'blob' | 'text';
  silent?: boolean;
  rawResponse?: boolean;
  useAlert?: boolean;
  responseKey?: string;
  withToken?: boolean;
  'gql:selection'?: string;
  useApiUrl?: boolean;
  delimiter?: string;
  valueField?: string;
  labelField?: string;
  filter?: Record<string, unknown>;
  cancelExecutor?: (cancel: () => void) => void;
  _page?: AmisPageObject;
}

export interface AmisFetcherResult<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

export function isAmisFetcherResult(value: unknown): value is AmisFetcherResult {
  return typeof value === 'object' && value !== null && 'status' in value && 'data' in value;
}

export interface AmisPageProvider {
  getPage: (schemaPath: string) => Promise<unknown>;
}

export interface AmisDictProvider {
  getDict: (dictName: string, options: AmisRequestOptions) => Promise<AmisFetcherResult>;
}

export interface AmisPageObject {
  id: string;
  schemaPath?: string;
  registerAction: (name: string, action: AmisAction) => void;
  getAction: (name: string) => AmisAction | undefined;
  resetActions: () => void;
  getComponent: (name: string) => unknown;
  getScopedStore: (name: string) => unknown;
  getState: (name: string) => unknown;
  setState: (name: string, value: unknown) => void;
  destroy: () => void;
}

/** Adapter that bridges the amis renderer to the host shell's runtime services. */
export interface AmisRuntimeAdapter {
  /** Returns the i18n helper for translations. */
  getI18n: () => AmisI18nLike;
  /** Returns the current locale string (e.g. "zh-CN"). */
  getLocale: () => string;
  /** Returns the currently authenticated user, or null. */
  getCurrentUser: () => User | null;
  /** Returns the current auth token, if any. */
  getAuthToken: () => string | undefined;
  /** Persists or clears the auth token. */
  setAuthToken: (token?: string) => void;
  /** Checks whether the current user holds the given role. */
  hasRole: (role: string) => boolean;
  /** Returns the active theme configuration. */
  getThemeConfig: () => ThemeConfig;
  /** Navigates to a URL within the host shell. */
  navigate: (to: string, options?: { replace?: boolean; state?: unknown }) => void;
  /** Checks whether the given URL matches the current location. */
  isCurrentUrl: (to: string) => boolean;
  /** Displays a toast notification to the user. */
  notify: (type: AmisToastType, message: string) => void;
  /** Shows a modal alert dialog. */
  alert: (message: string, title?: string) => Promise<void>;
  /** Shows a modal confirmation dialog. */
  confirm: (message: string, title?: string) => Promise<boolean>;
  /** Initiates logout with the given reason. */
  logout: (reason: string) => void;
  /** Provider for loading page schemas by path. */
  pageProvider: AmisPageProvider;
  /** Provider for loading dictionary data. */
  dictProvider: AmisDictProvider;
  /** Optional hook to transform outgoing requests. */
  processRequest?: (request: AmisRequestOptions) => AmisRequestOptions;
  /** Optional hook to transform the response promise. */
  processResponse?: <T>(response: Promise<T>) => Promise<T>;
  /** Optional custom HTTP request implementation. */
  request?: <T>(request: HttpRequestOptions) => Promise<HttpResponse<T>>;
  /** Optional resolver for named actions bound to a page. */
  resolveAction?: (name: string, page: AmisPageObject) => AmisAction | undefined;
  /** Optional compiler for turning code strings into callable actions. */
  compileFunction?: (code: string, page: AmisPageObject) => AmisAction;
}

export type AmisSchemaRecord = Record<string, unknown>;

export interface ProcessSchemaOptions {
  onObject?: (
    value: AmisSchemaRecord,
  ) => Promise<AmisSchemaRecord | null | undefined> | AmisSchemaRecord | null | undefined;
}
