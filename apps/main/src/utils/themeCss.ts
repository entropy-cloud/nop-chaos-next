import { normalizeThemeId, type DisplayMode, type ThemeConfig } from '@nop-chaos/shared';
import { resolveThemeConfig } from '../config/themeResolution';

const HOST_THEME_VARIABLES = [
  'primary',
  'primary-dark',
  'primary-light',
  'primary-bg',
  'primary-foreground',
  'secondary',
  'secondary-surface',
  'secondary-surface-hover',
  'secondary-foreground',
  'success',
  'success-bg',
  'danger',
  'danger-bg',
  'warning',
  'warning-bg',
  'background',
  'foreground',
  'card',
  'card-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'border',
  'input',
  'ring',
] as const;

export function resolveDisplayMode(mode: DisplayMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return mode;
}

export function applyThemeToDocument(themeConfig: ThemeConfig): void {
  const root = document.documentElement;
  const normalizedThemeId = normalizeThemeId(themeConfig.themeId);
  const resolvedThemeConfig = resolveThemeConfig(themeConfig);
  const resolvedMode = resolveDisplayMode(resolvedThemeConfig.displayMode);
  const resolvedThemeId = resolvedThemeConfig.themeId;

  if (import.meta.env.DEV && resolvedThemeId !== normalizedThemeId) {
    console.warn(
      `[theme] Theme "${normalizedThemeId}" is not registered. Falling back to "${resolvedThemeId}".`,
    );
  }

  root.dataset.theme = resolvedThemeId;
  root.dataset.mode = resolvedMode;
  root.classList.toggle('dark', resolvedMode === 'dark');

  for (const variable of HOST_THEME_VARIABLES) {
    root.style.setProperty(`--${variable}`, `var(--host-${variable})`);
  }
}

export function subscribeToSystemDisplayMode(themeConfig: ThemeConfig, onChange?: () => void) {
  if (themeConfig.displayMode !== 'system') {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    applyThemeToDocument(themeConfig);
    onChange?.();
  };

  mediaQuery.addEventListener('change', handleChange);

  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
}
