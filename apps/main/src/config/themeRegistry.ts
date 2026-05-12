import type { ThemeId } from '@nop-chaos/shared';

export interface ThemeDefinition {
  id: ThemeId;
  labelKey: string;
  descriptionKey?: string;
}

const defaultThemes: ThemeDefinition[] = [
  {
    id: 'classic',
    labelKey: 'settings.themeOptions.classic.label',
    descriptionKey: 'settings.themeOptions.classic.description',
  },
  {
    id: 'glass',
    labelKey: 'settings.themeOptions.glass.label',
    descriptionKey: 'settings.themeOptions.glass.description',
  },
];

const themeRegistry: ThemeDefinition[] = [...defaultThemes];

export function registerThemes(themes: ThemeDefinition[]): void {
  for (const theme of themes) {
    const index = themeRegistry.findIndex((item) => item.id === theme.id);

    if (index >= 0) {
      themeRegistry[index] = theme;
      continue;
    }

    themeRegistry.push(theme);
  }
}

export function getThemeRegistry(): ThemeDefinition[] {
  return [...themeRegistry];
}

export function getDefaultThemeId(): ThemeId {
  return themeRegistry[0]?.id ?? 'classic';
}

export function getThemeDefinition(themeId?: string): ThemeDefinition | undefined {
  return themeRegistry.find((theme) => theme.id === themeId);
}

export function hasRegisteredTheme(themeId?: string): boolean {
  return Boolean(getThemeDefinition(themeId));
}

export function getNextThemeId(themeId?: string): ThemeId {
  if (themeRegistry.length === 0) {
    return 'classic';
  }

  const index = themeRegistry.findIndex((theme) => theme.id === themeId);
  const nextIndex = index >= 0 ? (index + 1) % themeRegistry.length : 0;

  return themeRegistry[nextIndex].id;
}
