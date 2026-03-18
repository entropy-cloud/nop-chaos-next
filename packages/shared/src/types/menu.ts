import type { AppIconName } from './icon'

export interface MenuItem {
  id: string
  title?: string
  titleKey?: string
  path: string
  icon?: AppIconName
  children?: MenuItem[]
  badge?: string
  pageType: 'builtin' | 'plugin' | 'amis' | 'iframe' | 'external'
  componentId?: string
  pluginUrl?: string
  schemaPath?: string
  frameSrc?: string
  externalUrl?: string
  roles?: string[]
  sort?: number
  hideInMenu?: boolean
}

export interface MenuResponse {
  items: MenuItem[]
  home?: string
}
