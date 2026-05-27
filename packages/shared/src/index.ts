export { appIconNames } from './types/icon';
export type { AppIconName } from './types/icon';
export { isAppIconName, normalizeAppIconName } from './types/icon';

export type { ExtensionBuiltinPageComponent } from './types/extension';
export type {
  ExtensionBuiltinPage,
  ExtensionLanguage,
  ExtensionI18nResource,
  ExtensionI18nConfig,
  ExtensionTheme,
  ExtensionStyleAsset,
  ExtensionAppConfig,
  ExtensionBrandingConfig,
  ExtensionLoginUiFeature,
  ExtensionLoginUiConfig,
  ExtensionShellConfig,
  ExtensionSystemPagesConfig,
  TokenStorageType,
  ExtensionAuthConfig,
  ExtensionModule,
  ExtensionEntrySource,
  ExtensionLoaderSource,
  ExtensionSource,
  ExtensionLogger,
  ExtensionSetupContext,
  ShellExtension,
  LoadedExtension,
  LoadExtensionsOptions,
  ExtensionManifest,
} from './types/extension';

export type { MenuItem, MenuResponse } from './types/menu';

export type { PluginManifest } from './types/plugin';

export type { AppTab } from './types/tab';

export type { DisplayMode, ThemeId } from './types/theme';
export type { ThemeConfig } from './types/theme';
export { normalizeThemeId } from './types/theme';

export type {
  User,
  AuthTokens,
  AuthState,
  AuthBootstrapStatus,
  AuthSession,
} from './types/user';

export type { AuthRuntimeConfig } from './auth/config';
export { getAuthConfig, setAuthConfig, resetAuthConfig } from './auth/config';

export type { TokenStorage, RefreshTokenResponse, RefreshTokenFetcher } from './auth/tokenManager';
export {
  createTokenStorage,
  getTokenStorage,
  resetTokenStorage,
  setRefreshTokenFetcher,
  getRefreshPromise,
  setRefreshPromise,
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpiringSoon,
  isTokenExpired,
  refreshAccessToken,
  getValidToken,
  decodeJwtPayload,
  getTokenExpiry,
} from './auth/tokenManager';

export { createHttpClient } from './http/client';

export type { ApiPayload } from './http/payload';
export { isApiPayload, unwrapApiPayload } from './http/payload';

export type { HttpRuntime, HttpRequestOptions, HttpResponse } from './http/types';

export {
  getBaseOrigin,
  hasProtocolPath,
  isAbsoluteUrl,
  isProtocolRelativePath,
  isRelativeOrRootPath,
  appendQueryParams,
  normalizeRequestUrl,
  resolveRequestUrl,
  resolveSameOriginPath,
} from './http/url';

export { validateMenuResponse } from './utils/menuConfig';

export {
  matchMenuPath,
  flattenMenus,
  findMenuItemByPath,
  collectBreadcrumbTrail,
  filterMenusByRoles,
  sortMenus,
} from './utils/menu';
