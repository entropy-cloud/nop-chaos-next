import type { MenuItem } from './menu';
import type { PluginManifest } from './plugin';
import type { PageTransformerRegistration } from './pageTransformer';
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

/**
 * Shell chrome mode controls which shell chrome elements (sidebar, tabs bar, top bar)
 * are rendered around the page content area.
 *
 * - `full`: complete shell chrome (Sidebar + TabsBar + TopBar + content area)
 * - `chromeless`: only the content area, rendered full-screen
 */
export type ShellChromeMode = 'full' | 'chromeless';

/**
 * Per-profile override contributed by an extension via `ExtensionShellConfig.profiles`.
 * Allows an extension to adjust the default `siteId` / `chromeMode` derivation for a
 * specific profile name without changing how the profile name itself is resolved.
 */
export interface ShellProfileOverride {
  siteId?: string;
  chromeMode?: ShellChromeMode;
}

export interface ExtensionShellConfig {
  defaultHomePath?: string;
  helpUrl?: string;
  aboutUrl?: string;
  supportUrl?: string;
  sidebarWidthRem?: number;
  sidebarCollapsedWidthRem?: number;
  /**
   * Per-profile overrides keyed by profile name. When the active profile name matches
   * a key here, the listed fields override the default derivation
   * (`siteId === name`, `chromeMode = name === 'web' ? 'full' : 'chromeless'`).
   * Multiple extensions are merged in `order` ascending; later extensions win.
   */
  profiles?: Record<string, ShellProfileOverride>;
}

export type ExtensionDeltaOverride = 'merge' | 'replace' | 'remove';

export interface ExtensionUserMenuItem {
  id: string;
  title?: string;
  titleKey?: string;
  icon?: string;
  path?: string;
  href?: string;
  externalUrl?: string;
  pageType?: MenuItem['pageType'];
  componentId?: string;
  pluginUrl?: string;
  schemaPath?: string;
  frameSrc?: string;
  roles?: string[];
  sort?: number;
  children?: ExtensionUserMenuItem[];
  override?: ExtensionDeltaOverride;
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
  /**
   * CSS asset paths already pre-injected into the host `<head>` by the server-side
   * `IndexHtmlProvider` (Java `nop.web` module). Present only under the production
   * contract where `<link rel="stylesheet" data-nop-extension data-nop-extension-id="<id>">`
   * tags are emitted as part of the `<!--NOP_EXTENSIONS_INJECT-->` replacement.
   *
   * Front-end bootstrap must NOT call `ensureStylesheet` again when this list contains
   * the matching href — the browser has already loaded the stylesheet via the
   * server-rendered `<link>`. Under the prototype / `window.__NOP_EXTENSIONS__`
   * contract this field is omitted; CSS is loaded via `import()` inside the entry
   * module's chunk graph.
   */
  styleAssets?: string[];
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
  /**
   * Minimum host API version this extension requires to function correctly
   * (see `HOST_API_VERSION`). Hosts that expose `window.__NOP_HOST_API_VERSION__`
   * log a warning when the requirement is not satisfied; older hosts that do
   * not know this field ignore it entirely.
   */
  minHostApiVersion?: string;
  /**
   * Restrict this extension to a specific set of shell profile names (e.g. `['mobile']`).
   * When omitted, the extension loads under every profile. Matching is by the active
   * profile `name` (resolved from URL / window injection). Non-matching extensions are
   * skipped entirely: their `setup()` is not invoked and no resources are injected.
   */
  profiles?: string[];
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
  /** Deprecated: host navigation menus are backend-owned. Use backend site map data instead. */
  menus?: MenuItem[];
  /** Deprecated: host navigation menus are backend-owned. */
  overrideMenus?: boolean;
  /** Delta customizations for the left-bottom sidebar user menu. */
  userMenuItems?: ExtensionUserMenuItem[];
  /** Authentication configuration (token storage, refresh). */
  auth?: ExtensionAuthConfig;
  /**
   * Page JSON post-processing transformers.
   * Executed in order after page JSON is loaded, before rendering.
   * Multiple extensions' transformers are merged and sorted globally.
   */
  pageTransformers?: PageTransformerRegistration[];
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
  /**
   * Active shell profile name. When set, extensions that declare a `profiles` array
   * not containing this value are skipped (no `setup()`, no side effects applied).
   * Extensions without a `profiles` declaration always load.
   */
  profileName?: string;
}

export interface ExtensionManifest {
  id: string;
  name: string;
  version?: string;
  description?: string;
  entry: string;
  /**
   * CSS asset paths (relative to `entry`) that the extension wants the host
   * shell to load before `entry`. Populated by
   * `examples/extension-demo/vite.config.ts` `extensionManifestPlugin` from
   * `new URL('./xxx.css', import.meta.url)` literals in the entry source.
   */
  styleAssets?: string[];
  /**
   * Non-CSS static asset paths (relative to `entry`) that the extension
   * references through `new URL('./xxx', import.meta.url)`. Includes SVGs,
   * fonts, JSON, etc. The Java `IndexHtmlProvider` reads these and copies
   * them alongside `extension.json` in production deploys. The host front-end
   * does not load them directly; instead, the runtime `ShellExtension` field
   * values (e.g. `branding.logoUrl`, `themes[*].cssHref`) point to these
   * paths after the host prefixes them with the
   * `data-nop-extension-id`-driven base path.
   */
  assets?: string[];
}
