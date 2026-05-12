export type DisplayMode = 'light' | 'dark' | 'system';
export type ThemeId = 'classic' | 'glass' | (string & {});

export function normalizeThemeId(themeId?: string): ThemeId {
  if (!themeId || themeId === 'modern') {
    return 'classic';
  }

  return themeId as ThemeId;
}

export interface ThemeConfig {
  themeId: ThemeId;
  displayMode: DisplayMode;
}
