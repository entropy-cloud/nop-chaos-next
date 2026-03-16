import type { AppIconName } from './icon'

export interface MenuItem {
  id: string
  title?: string
  titleKey?: string
  path: string
  icon?: AppIconName
  children?: MenuItem[]
  badge?: string
  pageType: 'builtin' | 'plugin' | 'amis'
  componentId?: string
  pluginUrl?: string
  schemaPath?: string
  roles?: string[]
  sort?: number
  hideInMenu?: boolean
}

export interface MenuResponse {
  items: MenuItem[]
  home?: string
}
