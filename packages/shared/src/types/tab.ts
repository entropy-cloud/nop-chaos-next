import type { AppIconName } from './icon'

export interface AppTab {
  path: string
  title: string
  icon?: AppIconName
  closable?: boolean
}
