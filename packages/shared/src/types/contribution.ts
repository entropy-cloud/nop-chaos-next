import type { MenuItem } from './menu'
import type { PluginManifest } from './plugin'
import type { ComponentType, LazyExoticComponent } from 'react'

export type ContributionBuiltinPageComponent = ComponentType | LazyExoticComponent<ComponentType>

export interface ContributionBuiltinPage {
  componentId: string
  component: ContributionBuiltinPageComponent
}

export interface ContributionLanguage {
  code: string
  labelKey: string
}

export interface ContributionI18nResource {
  lng: string
  ns?: string
  resource: Record<string, unknown>
}

export interface ContributionTheme {
  id: string
  labelKey: string
  descriptionKey?: string
  cssHref?: string
}

export interface ContributionStyleAsset {
  id: string
  href: string
  scope?: 'shell' | 'plugin'
}

export interface ContributionAppConfig {
  name?: string
  shortName?: string
  logoUrl?: string
  defaultHomePath?: string
  defaultLanguage?: string
}

export interface ContributionBrandingConfig {
  name?: string
  shortName?: string
  logoUrl?: string
  markUrl?: string
  documentTitle?: string
  faviconUrl?: string
}

export interface ContributionLoginUiFeature {
  titleKey: string
  descriptionKey: string
}

export interface ContributionLoginUiConfig {
  heroTitleKey?: string
  heroDescriptionKey?: string
  cardTitleKey?: string
  cardDescriptionKey?: string
  features?: ContributionLoginUiFeature[]
  showDemoHint?: boolean
}

export interface ContributionShellConfig {
  defaultHomePath?: string
  helpUrl?: string
  aboutUrl?: string
  supportUrl?: string
}

export interface ContributionSystemPagesConfig {
  login?: string
  forbidden?: string
  notFound?: string
  serverError?: string
  dashboard?: string
}

export type TokenStorageType = 'sessionStorage' | 'localStorage' | 'memory' | 'none'

export interface ContributionAuthConfig {
  tokenStorage?: TokenStorageType
  persistRefreshToken?: boolean
  tokenRefreshBeforeExpiry?: number
  enableAutoRefresh?: boolean
  refreshTokenEndpoint?: string
}

export interface ContributionSource {
  id: string
  entry: string
  enabled?: boolean
}

export interface ContributionLogger {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
}

export interface ContributionSetupContext {
  logger: ContributionLogger
}

export interface ShellContribution {
  id: string
  order?: number
  app?: ContributionAppConfig
  branding?: ContributionBrandingConfig
  loginUi?: ContributionLoginUiConfig
  shell?: ContributionShellConfig
  systemPages?: ContributionSystemPagesConfig
  env?: Record<string, string>
  languages?: ContributionLanguage[]
  i18nResources?: ContributionI18nResource[]
  themes?: ContributionTheme[]
  styles?: ContributionStyleAsset[]
  builtinPages?: ContributionBuiltinPage[]
  plugins?: PluginManifest[]
  menus?: MenuItem[]
  auth?: ContributionAuthConfig
  setup?: (context: ContributionSetupContext) => void | Promise<void>
}

export interface LoadedContribution {
  source: ContributionSource
  contribution: ShellContribution
}

export interface LoadContributionsOptions {
  sources: ContributionSource[]
  context: ContributionSetupContext
}

export interface ContributionModule {
  default?: ShellContribution
  contribution?: ShellContribution
  getContribution?: () => ShellContribution | Promise<ShellContribution>
}
