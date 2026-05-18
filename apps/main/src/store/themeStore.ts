import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  normalizeThemeId,
  type DisplayMode,
  type ThemeConfig,
  type ThemeId,
} from '@nop-chaos/shared';
import { resolveThemeConfig } from '../config/themeResolution';
import { getDefaultThemeId } from '../config/themeRegistry';

interface ThemeState {
  themeConfig: ThemeConfig;
  setThemeId: (themeId: ThemeId) => void;
  setDisplayMode: (displayMode: DisplayMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeConfig: {
        themeId: getDefaultThemeId(),
        displayMode: 'system',
      },
      setThemeId: (themeId) =>
        set((state) => ({
          themeConfig: {
            ...state.themeConfig,
            themeId,
          },
        })),
      setDisplayMode: (displayMode) =>
        set((state) => ({
          themeConfig: {
            ...state.themeConfig,
            displayMode,
          },
        })),
    }),
    {
      name: 'theme:v1',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ThemeState> | undefined;
        const persistedTheme = persisted?.themeConfig;

        if (!persistedTheme) {
          return currentState;
        }

        return {
          ...currentState,
          ...persisted,
          themeConfig: resolveThemeConfig({
            ...currentState.themeConfig,
            ...persistedTheme,
            themeId: normalizeThemeId(persistedTheme.themeId),
          }),
        };
      },
    },
  ),
);
