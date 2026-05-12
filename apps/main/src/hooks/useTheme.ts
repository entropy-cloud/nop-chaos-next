import { useMemo } from 'react';
import { useThemeStore } from '../store/themeStore';

export function useTheme() {
  const themeConfig = useThemeStore((state) => state.themeConfig);
  const setThemeId = useThemeStore((state) => state.setThemeId);
  const setDisplayMode = useThemeStore((state) => state.setDisplayMode);

  return useMemo(
    () => ({
      themeConfig,
      setThemeId,
      setDisplayMode,
    }),
    [setDisplayMode, setThemeId, themeConfig],
  );
}
