import type { MenuItem } from './menu';
import type { PluginManifest } from './plugin';
import type { ComponentType, LazyExoticComponent } from 'react';

export type ExtensionBuiltinPageComponent = ComponentType | LazyExoticComponent<ComponentType>;

export interface ExtensionBuiltinPage {
  componentId: string;
  component: ExtensionBuiltinPageComponent;
}

export interface ExtensionLanguage {
  code: string;
  labelKey: string;
}

export interface ExtensionI18nResource {
  lng: string;
  ns?: string;
  resource: Record<string, unknown>;
}

export interface ExtensionI18nConfig {
  baseUrl: string;
  languages: string[];
}

export interface ExtensionTheme {
  id: string;
  labelKey: string;
  descriptionKey?: string;
  cssHref?: string;
}

export interface ExtensionStyleAsset {
  id: string;
  href: string;
  scope?: 'shell' | 'plugin';
}

export interface ExtensionAppConfig {
  name?: string;
  shortName?: string;
  logoUrl?: string;
  defaultHomePath?: string;
  defaultLanguage?: string;
}

export interface ExtensionBrandingConfig {
  name?: string;
  shortName?: string;
  logoUrl?: string;
  markUrl?: string;
  documentTitle?: string;
  faviconUrl?: string;
}

export interface ExtensionLoginUiFeature {
  titleKey: string;
  descriptionKey: string;
}

export interface ExtensionLoginUiConfig {
  heroTitleKey?: string;
  heroDescriptionKey?: string;
  cardTitleKey?: string;
  cardDescriptionKey?: string;
  features?: ExtensionLoginUiFeature[];
  showDemoHint?: boolean;
}

export interface ExtensionShellConfig {
  defaultHomePath?: string;
  helpUrl?: string;
  aboutUrl?: string;
  supportUrl?: string;
}

export interface ExtensionSystemPagesConfig {
  login?: string;
  forbidden?: string;
  notFound?: string;
  serverError?: string;
  dashboard?: string;
}

export type TokenStorageType = 'sessionStorage' | 'localStorage' | 'memory' | 'none';

export interface ExtensionAuthConfig {
  tokenStorage?: TokenStorageType;
  persistRefreshToken?: boolean;
  tokenRefreshBeforeExpiry?: number;
  enableAutoRefresh?: boolean;
  refreshTokenEndpoint?: string;
}

export interface ExtensionModule {
  default?: ShellExtension;
  extension?: ShellExtension;
  getExtension?: () => ShellExtension | Promise<ShellExtension>;
}

interface ExtensionSourceBase {
  id: string;
  enabled?: boolean;
}

export interface ExtensionEntrySource extends ExtensionSourceBase {
  entry: string;
}

export interface ExtensionLoaderSource extends ExtensionSourceBase {
  load: () => Promise<ExtensionModule>;
}

export type ExtensionSource = ExtensionEntrySource | ExtensionLoaderSource;

export interface ExtensionLogger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export interface ExtensionSetupContext {
  logger: ExtensionLogger;
}

/** Describes a single extension that contributes configuration to the shell. */
export interface ShellExtension {
  /** Unique identifier for this extension. */
  id: string;
  /** Loading priority; lower values load first. */
  order?: number;
  /** Application-level metadata (name, logo, home path). */
  app?: ExtensionAppConfig;
  /** Branding assets (logo, favicon, document title). */
  branding?: ExtensionBrandingConfig;
  /** Login page UI configuration. */
  loginUi?: ExtensionLoginUiConfig;
  /** Shell-wide settings (home path, help/about URLs). */
  shell?: ExtensionShellConfig;
  /** Paths for system pages (login, 403, 404, 500). */
  systemPages?: ExtensionSystemPagesConfig;
  /** Arbitrary key-value environment variables exposed to the shell. */
  env?: Record<string, string>;
  /** Deprecated — use `supportedLanguages` instead. */
  languages?: ExtensionLanguage[];
  /** Languages this extension provides translations for. */
  supportedLanguages?: ExtensionLanguage[];
  /** i18n resource location and namespace configuration. */
  i18n?: ExtensionI18nConfig;
  /** Inline i18n translation resources. */
  i18nResources?: ExtensionI18nResource[];
  /** Available visual themes. */
  themes?: ExtensionTheme[];
  /** CSS/style assets to load into the shell. */
  styles?: ExtensionStyleAsset[];
  /** Page components registered as built-in routes. */
  builtinPages?: ExtensionBuiltinPage[];
  /** Remote plugin manifests to register. */
  plugins?: PluginManifest[];
  /** Menu items to add to the sidebar. */
  menus?: MenuItem[];
  /** When true, replaces the entire menu tree instead of merging. */
  overrideMenus?: boolean;
  /** Authentication configuration (token storage, refresh). */
  auth?: ExtensionAuthConfig;
  /** Lifecycle hook called after the extension is loaded. */
  setup?: (context: ExtensionSetupContext) => void | Promise<void>;
}

export interface LoadedExtension {
  source: ExtensionSource;
  extension: ShellExtension;
}

export interface LoadExtensionsOptions {
  sources: ExtensionSource[];
  context: ExtensionSetupContext;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version?: string;
  description?: string;
  entry: string;
  styleAssets?: string[];
}
