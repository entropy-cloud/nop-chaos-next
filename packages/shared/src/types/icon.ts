export const appIconNames = [
  'badge-help',
  'blocks',
  'book-open-text',
  'bot',
  'database',
  'edit',
  'git-branch',
  'globe-2',
  'home',
  'languages',
  'layout-dashboard',
  'list',
  'palette',
  'panels-top-left',
  'plug-zap',
  'puzzle',
  'settings-2',
  'table',
  'workflow'
] as const

export type AppIconName = (typeof appIconNames)[number]

export function isAppIconName(value: string): value is AppIconName {
  return (appIconNames as readonly string[]).includes(value)
}
