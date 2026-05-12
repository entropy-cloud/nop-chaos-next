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
  'workflow',
] as const;

export type AppIconName = (typeof appIconNames)[number];

const appIconAliasMap: Record<string, AppIconName> = {
  'badge-help': 'badge-help',
  blocks: 'blocks',
  'book-open-text': 'book-open-text',
  bot: 'bot',
  database: 'database',
  edit: 'edit',
  'git-branch': 'git-branch',
  'globe-2': 'globe-2',
  home: 'home',
  house: 'home',
  languages: 'languages',
  language: 'languages',
  'layout-dashboard': 'layout-dashboard',
  list: 'list',
  palette: 'palette',
  'panels-top-left': 'panels-top-left',
  'plug-zap': 'plug-zap',
  puzzle: 'puzzle',
  'puzzle-piece': 'puzzle',
  'settings-2': 'settings-2',
  gear: 'settings-2',
  cog: 'settings-2',
  table: 'table',
  workflow: 'workflow',
};

function toIconLookupKey(value: string) {
  return value
    .trim()
    .replace(/^fa[srlbdt]?\s+/i, '')
    .replace(/^fa-(solid|regular|light|thin|duotone|brands)\s+/i, '')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .toLowerCase();
}

export function isAppIconName(value: string): value is AppIconName {
  return (appIconNames as readonly string[]).includes(value);
}

export function normalizeAppIconName(value?: string): AppIconName | undefined {
  if (!value) {
    return undefined;
  }

  if (isAppIconName(value)) {
    return value;
  }

  return appIconAliasMap[toIconLookupKey(value)];
}
