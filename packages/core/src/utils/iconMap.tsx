import { isAppIconName, type AppIconName } from '@nop-chaos/shared'
import type { LucideIcon, LucideProps } from 'lucide-react'
import {
  BadgeHelp,
  Blocks,
  BookOpenText,
  Bot,
  Database,
  Edit3,
  GitBranch,
  Globe2,
  Home,
  Languages,
  LayoutDashboard,
  ListTree,
  PanelsTopLeft,
  Palette,
  PlugZap,
  Puzzle,
  Settings2,
  Table2,
  Workflow
} from 'lucide-react'

export const iconRegistry: Record<AppIconName, LucideIcon> = {
  'badge-help': BadgeHelp,
  blocks: Blocks,
  'book-open-text': BookOpenText,
  bot: Bot,
  database: Database,
  edit: Edit3,
  'git-branch': GitBranch,
  'globe-2': Globe2,
  home: Home,
  languages: Languages,
  'layout-dashboard': LayoutDashboard,
  list: ListTree,
  palette: Palette,
  'panels-top-left': PanelsTopLeft,
  'plug-zap': PlugZap,
  puzzle: Puzzle,
  'settings-2': Settings2,
  table: Table2,
  workflow: Workflow
}

export function getIconByName(iconName?: string, fallback: AppIconName = 'home'): LucideIcon {
  if (iconName && isAppIconName(iconName)) {
    return iconRegistry[iconName]
  }

  return iconRegistry[fallback]
}

export function resolveIcon(iconName?: AppIconName): LucideIcon {
  return getIconByName(iconName, 'home')
}

export function renderIcon(iconName?: string, props?: LucideProps, fallback: AppIconName = 'home') {
  const Icon = getIconByName(iconName, fallback)
  return <Icon {...props} />
}
