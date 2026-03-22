import type { MenuItem } from './menu'
import type { PluginManifest } from './plugin'
import type { ComponentType, LazyExoticComponent } from 'react'

export type ExtensionBuiltinPageComponent = ComponentType | LazyExoticComponent<ComponentType>

export interface ExtensionBuiltinPage {
  componentId: string
  component: ExtensionBuiltinPageComponent
}

export interface ExtensionLanguage {
  code: string
  labelKey: string
}

export interface ExtensionI18nResource {
  lng: string
  ns?: string
  resource: Record<string, unknown>
}

export interface ExtensionTheme {
  id: string
  labelKey: string
  descriptionKey?: string
  cssHref?: string
}

export interface ExtensionStyleAsset {
  id: string
  href: string
  scope?: 'shell' | 'plugin'
}

export interface ExtensionAppConfig {
  name?: string
  shortName?: string
  logoUrl?: string
  defaultHomePath?: string
  defaultLanguage?: string
}

export interface ExtensionBrandingConfig {
  name?: string
  shortName?: string
  logoUrl?: string
  markUrl?: string
  documentTitle?: string
  faviconUrl?: string
}

export interface ExtensionLoginUiFeature {
  titleKey: string
  descriptionKey: string
}

export interface ExtensionLoginUiConfig {
  heroTitleKey?: string
  heroDescriptionKey?: string
  cardTitleKey?: string
  cardDescriptionKey?: string
  features?: ExtensionLoginUiFeature[]
  showDemoHint?: boolean
}

export interface ExtensionShellConfig {
  defaultHomePath?: string
  helpUrl?: string
  aboutUrl?: string
  supportUrl?: string
}

export interface ExtensionSystemPagesConfig {
  login?: string
  forbidden?: string
  notFound?: string
  serverError?: string
  dashboard?: string
}

export type TokenStorageType = 'sessionStorage' | 'localStorage' | 'memory' | 'none'

export interface ExtensionAuthConfig {
  tokenStorage?: TokenStorageType
  persistRefreshToken?: boolean
  tokenRefreshBeforeExpiry?: number
  enableAutoRefresh?: boolean
  refreshTokenEndpoint?: string
}

export interface ExtensionModule {
  default?: ShellExtension
  extension?: ShellExtension
  getExtension?: () => ShellExtension | Promise<ShellExtension>
}

interface ExtensionSourceBase {
  id: string
  enabled?: boolean
}

export interface ExtensionEntrySource extends ExtensionSourceBase {
  entry: string
}

export interface ExtensionLoaderSource extends ExtensionSourceBase {
  load: () => Promise<ExtensionModule>
}

export type ExtensionSource = ExtensionEntrySource | ExtensionLoaderSource

export interface ExtensionLogger {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
}

export interface ExtensionSetupContext {
  logger: ExtensionLogger
}

export interface ShellExtension {
  id: string
  order?: number
  app?: ExtensionAppConfig
  branding?: ExtensionBrandingConfig
  loginUi?: ExtensionLoginUiConfig
  shell?: ExtensionShellConfig
  systemPages?: ExtensionSystemPagesConfig
  env?: Record<string, string>
  languages?: ExtensionLanguage[]
  supportedLanguages?: ExtensionLanguage[]
  i18nResources?: ExtensionI18nResource[]
  themes?: ExtensionTheme[]
  styles?: ExtensionStyleAsset[]
  builtinPages?: ExtensionBuiltinPage[]
  plugins?: PluginManifest[]
  menus?: MenuItem[]
  overrideMenus?: boolean
  auth?: ExtensionAuthConfig
  setup?: (context: ExtensionSetupContext) => void | Promise<void>
}

export interface LoadedExtension {
  source: ExtensionSource
  extension: ShellExtension
}

export interface LoadExtensionsOptions {
  sources: ExtensionSource[]
  context: ExtensionSetupContext
}
