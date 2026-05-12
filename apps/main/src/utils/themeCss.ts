import { getDefaultThemeId, hasRegisteredTheme } from '../config/themeRegistry';
import { normalizeThemeId, type DisplayMode, type ThemeConfig } from '@nop-chaos/shared';

export function resolveDisplayMode(mode: DisplayMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return mode;
}

export function applyThemeToDocument(themeConfig: ThemeConfig): void {
  const root = document.documentElement;
  const resolvedMode = resolveDisplayMode(themeConfig.displayMode);
  const normalizedThemeId = normalizeThemeId(themeConfig.themeId);
  const resolvedThemeId = hasRegisteredTheme(normalizedThemeId)
    ? normalizedThemeId
    : getDefaultThemeId();

  if (import.meta.env.DEV && resolvedThemeId !== normalizedThemeId) {
    console.warn(
      `[theme] Theme "${normalizedThemeId}" is not registered. Falling back to "${resolvedThemeId}".`,
    );
  }

  root.dataset.theme = resolvedThemeId;
  root.dataset.mode = resolvedMode;
  root.classList.toggle('dark', resolvedMode === 'dark');
}
