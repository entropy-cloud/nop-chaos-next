export interface MenuItem {
  id: string
  title?: string
  titleKey?: string
  path: string
  icon?: string
  children?: MenuItem[]
  badge?: string
  pageType: 'builtin' | 'plugin' | 'amis' | 'flux' | 'iframe' | 'external'
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
