import { normalizeThemeId, type ThemeConfig } from '@nop-chaos/shared';

import { getDefaultThemeId, hasRegisteredTheme } from './themeRegistry';

export function resolveThemeConfig(themeConfig: ThemeConfig): ThemeConfig {
  const normalizedThemeId = normalizeThemeId(themeConfig.themeId);

  return {
    ...themeConfig,
    themeId: hasRegisteredTheme(normalizedThemeId) ? normalizedThemeId : getDefaultThemeId(),
  };
}
