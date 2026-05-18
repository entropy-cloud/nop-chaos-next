import { useEffect } from 'react';
import type { ThemeConfig } from '@nop-chaos/shared';
import { applyThemeToDocument, subscribeToSystemDisplayMode } from '../utils/themeCss';

export function useSystemDisplayMode(themeConfig: ThemeConfig): void {
  useEffect(() => {
    applyThemeToDocument(themeConfig);
  }, [themeConfig]);

  useEffect(() => {
    return subscribeToSystemDisplayMode(themeConfig);
  }, [themeConfig]);
}
