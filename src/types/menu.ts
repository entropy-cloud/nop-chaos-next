export const PageType = {
  BUILTIN: "builtin",
  PLUGIN: "plugin",
  EXTERNAL: "external",
} as const

export type PageType = (typeof PageType)[keyof typeof PageType]

export interface BuiltinPageConfig {
  type: "builtin"
  componentName: string
  params?: Record<string, any>
}

export interface PluginPageConfig {
  type: "plugin"
  moduleId: string
  componentPath: string
  params?: Record<string, any>
}

export interface ExternalLinkConfig {
  type: "external"
  url: string
  target?: "_blank" | "_self" | "_parent" | "_top"
}

export type PageConfig =
  | BuiltinPageConfig
  | PluginPageConfig
  | ExternalLinkConfig

export interface MenuItem {
  id: string
  title: string
  labelKey?: string
  path?: string
  icon?: string
  badge?: string | number
  page?: PageConfig
  children?: MenuItem[]
  meta?: {
    order?: number
    hidden?: boolean
    permissions?: string[]
    closable?: boolean
  }
}

export interface MenuResponse {
  menus: MenuItem[]
  version?: string
  timestamp?: number
}

export interface FlatMenuItem extends MenuItem {
  parentPath?: string
  level: number
}

export interface BuiltinComponentRegistration {
  name: string
  component: React.ComponentType<any>
  path?: string
}

export interface PluginModuleConfig {
  id: string
  name: string
  componentPath: string
  manifest?: PluginManifest
}

export interface PluginManifest {
  name: string
  version: string
  description?: string
  author?: string
  components?: string[]
}
