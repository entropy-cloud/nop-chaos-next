import { useEffect } from 'react';
import type { ThemeConfig } from '@nop-chaos/shared';
import { applyThemeToDocument } from '../utils/themeCss';

export function useSystemDisplayMode(themeConfig: ThemeConfig): void {
  useEffect(() => {
    applyThemeToDocument(themeConfig);
  }, [themeConfig]);

  useEffect(() => {
    if (themeConfig.displayMode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyThemeToDocument(themeConfig);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [themeConfig]);
}
