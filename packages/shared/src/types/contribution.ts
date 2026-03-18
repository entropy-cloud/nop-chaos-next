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
  env?: Record<string, string>
  languages?: ContributionLanguage[]
  i18nResources?: ContributionI18nResource[]
  themes?: ContributionTheme[]
  styles?: ContributionStyleAsset[]
  builtinPages?: ContributionBuiltinPage[]
  plugins?: PluginManifest[]
  menus?: MenuItem[]
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
