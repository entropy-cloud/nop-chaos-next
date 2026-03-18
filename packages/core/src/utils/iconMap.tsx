import { cn } from '@nop-chaos/ui'
import { normalizeAppIconName, type AppIconName } from '@nop-chaos/shared'
import type { HTMLAttributes, JSX } from 'react'

export type AppIconProps = HTMLAttributes<HTMLSpanElement>
export type AppIconComponent = (props: AppIconProps) => JSX.Element

const fontAwesomeAliasMap: Record<string, string> = {
  'badge-help': 'circle-question',
  blocks: 'cubes',
  'book-open-text': 'book-open',
  bot: 'robot',
  chartline: 'chart-line',
  'line-chart': 'chart-line',
  cog: 'gear',
  cubes: 'cubes',
  database: 'database',
  edit: 'pen-to-square',
  'edit-3': 'pen-to-square',
  gear: 'gear',
  'git-branch': 'code-branch',
  globe: 'globe',
  'globe-2': 'globe',
  home: 'house',
  house: 'house',
  language: 'language',
  languages: 'language',
  'layout-dashboard': 'table-columns',
  list: 'list',
  palette: 'palette',
  'panels-top-left': 'table-cells-large',
  plug: 'plug',
  'plug-zap': 'plug',
  puzzle: 'puzzle-piece',
  'puzzle-piece': 'puzzle-piece',
  'settings-2': 'gear',
  table: 'table',
  workflow: 'diagram-project'
}

export const iconRegistry: Record<AppIconName, string> = {
  'badge-help': 'circle-question',
  blocks: 'cubes',
  'book-open-text': 'book-open',
  bot: 'robot',
  database: 'database',
  edit: 'pen-to-square',
  'git-branch': 'code-branch',
  'globe-2': 'globe',
  home: 'house',
  languages: 'language',
  'layout-dashboard': 'table-columns',
  list: 'list',
  palette: 'palette',
  'panels-top-left': 'table-cells-large',
  'plug-zap': 'plug',
  puzzle: 'puzzle-piece',
  'settings-2': 'gear',
  table: 'table',
  workflow: 'diagram-project'
}

function toIconLookupKey(value: string) {
  return value
    .trim()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .toLowerCase()
}

function resolveFontAwesomeName(iconName?: string, fallback: AppIconName = 'home') {
  const normalizedAppIcon = normalizeAppIconName(iconName)

  if (normalizedAppIcon) {
    return iconRegistry[normalizedAppIcon]
  }

  const lookupKey = iconName ? toIconLookupKey(iconName) : ''
  return (fontAwesomeAliasMap[lookupKey] ?? lookupKey) || iconRegistry[fallback]
}

function hasFontAwesomeBaseClass(iconName: string) {
  return /(^|\s)(fa|fas|far|fab|fa-solid|fa-regular|fa-brands)(\s|$)/.test(iconName)
}

function buildFontAwesomeClassName(iconName?: string, fallback: AppIconName = 'home') {
  const trimmedIconName = iconName?.trim()

  if (!trimmedIconName) {
    return `fa fa-${iconRegistry[fallback]}`
  }

  if (hasFontAwesomeBaseClass(trimmedIconName)) {
    return trimmedIconName
  }

  if (/(^|\s)fa-[\w-]+(\s|$)/.test(trimmedIconName)) {
    return `fa ${trimmedIconName}`
  }

  return `fa fa-${resolveFontAwesomeName(trimmedIconName, fallback)}`
}

export function getIconByName(iconName?: string, fallback: AppIconName = 'home'): AppIconComponent {
  return function AppIcon({ className, title, ...props }: AppIconProps) {
    const accessibilityProps = title
      ? {
          'aria-label': title,
          role: 'img' as const
        }
      : {
          'aria-hidden': true as const
        }

    return (
      <span className={cn('inline-flex items-center justify-center leading-none', className)} title={title} {...accessibilityProps} {...props}>
        <i className={buildFontAwesomeClassName(iconName, fallback)} />
      </span>
    )
  }
}

export function resolveIcon(iconName?: string): AppIconComponent {
  return getIconByName(iconName, 'home')
}

export function renderIcon(iconName?: string, props?: AppIconProps, fallback: AppIconName = 'home') {
  const Icon = getIconByName(iconName, fallback)
  return Icon(props ?? {})
}
