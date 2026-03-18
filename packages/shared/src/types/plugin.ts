import type { AppIconName } from './icon'

export interface PluginManifest {
  id: string
  name: string
  icon: AppIconName
  description: string
  version: string
  author: string
  source: string
  enabled: boolean
  url: string
  updatedAt: string
  configSchema?: Array<{
    key: string
    label: string
    type: 'text' | 'number' | 'select'
    options?: string[]
    defaultValue?: string | number
  }>
  settings?: Record<string, string | number>
}
