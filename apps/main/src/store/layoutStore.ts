import { layoutConfig } from '../config/layout';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const MIN_SIDEBAR_WIDTH_REM = 14;
const MAX_SIDEBAR_WIDTH_REM = 28;
const MIN_SIDEBAR_COLLAPSED_WIDTH_REM = 4;
const MAX_SIDEBAR_COLLAPSED_WIDTH_REM = 8;

export interface LayoutDefaults {
  sidebarWidthRem: number;
  sidebarCollapsedWidthRem: number;
}

interface LayoutStore {
  sidebarCollapsed: boolean;
  expandedMenuIds: string[];
  sidebarWidthRem: number;
  sidebarCollapsedWidthRem: number;
  defaults: LayoutDefaults;
  hasUserCustomizedSidebarWidth: boolean;
  hasUserCustomizedSidebarCollapsedWidth: boolean;
  workspaceFullscreen: boolean;
  toggleSidebar: () => void;
  toggleMenuGroup: (id: string) => void;
  setSidebarWidthRem: (value: number) => void;
  setSidebarCollapsedWidthRem: (value: number) => void;
  syncSidebarDefaults: (defaults: Partial<LayoutDefaults>) => void;
  setWorkspaceFullscreen: (value: boolean) => void;
  toggleWorkspaceFullscreen: () => void;
  resetSidebarWidths: () => void;
}

function clampSidebarWidth(value: number, fallback: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, value));
}

function resolveLayoutDefaults(defaults?: Partial<LayoutDefaults>): LayoutDefaults {
  return {
    sidebarWidthRem: clampSidebarWidth(
      defaults?.sidebarWidthRem ?? layoutConfig.sidebarWidthRem,
      layoutConfig.sidebarWidthRem,
      MIN_SIDEBAR_WIDTH_REM,
      MAX_SIDEBAR_WIDTH_REM,
    ),
    sidebarCollapsedWidthRem: clampSidebarWidth(
      defaults?.sidebarCollapsedWidthRem ?? layoutConfig.sidebarCollapsedWidthRem,
      layoutConfig.sidebarCollapsedWidthRem,
      MIN_SIDEBAR_COLLAPSED_WIDTH_REM,
      MAX_SIDEBAR_COLLAPSED_WIDTH_REM,
    ),
  };
}

const initialDefaults = resolveLayoutDefaults();

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      expandedMenuIds: ['flow-editor', 'data-management', 'plugins', 'settings', 'help'],
      sidebarWidthRem: initialDefaults.sidebarWidthRem,
      sidebarCollapsedWidthRem: initialDefaults.sidebarCollapsedWidthRem,
      defaults: initialDefaults,
      hasUserCustomizedSidebarWidth: false,
      hasUserCustomizedSidebarCollapsedWidth: false,
      workspaceFullscreen: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleMenuGroup: (id) =>
        set((state) => ({
          expandedMenuIds: state.expandedMenuIds.includes(id)
            ? state.expandedMenuIds.filter((item) => item !== id)
            : [...state.expandedMenuIds, id],
        })),
      setSidebarWidthRem: (value) =>
        set((state) => ({
          sidebarWidthRem: clampSidebarWidth(
            value,
            state.defaults.sidebarWidthRem,
            MIN_SIDEBAR_WIDTH_REM,
            MAX_SIDEBAR_WIDTH_REM,
          ),
          hasUserCustomizedSidebarWidth: true,
        })),
      setSidebarCollapsedWidthRem: (value) =>
        set((state) => ({
          sidebarCollapsedWidthRem: clampSidebarWidth(
            value,
            state.defaults.sidebarCollapsedWidthRem,
            MIN_SIDEBAR_COLLAPSED_WIDTH_REM,
            MAX_SIDEBAR_COLLAPSED_WIDTH_REM,
          ),
          hasUserCustomizedSidebarCollapsedWidth: true,
        })),
      syncSidebarDefaults: (defaults) =>
        set((state) => {
          const nextDefaults = resolveLayoutDefaults({
            sidebarWidthRem: defaults.sidebarWidthRem ?? state.defaults.sidebarWidthRem,
            sidebarCollapsedWidthRem:
              defaults.sidebarCollapsedWidthRem ?? state.defaults.sidebarCollapsedWidthRem,
          });

          return {
            defaults: nextDefaults,
            sidebarWidthRem: state.hasUserCustomizedSidebarWidth
              ? state.sidebarWidthRem
              : nextDefaults.sidebarWidthRem,
            sidebarCollapsedWidthRem: state.hasUserCustomizedSidebarCollapsedWidth
              ? state.sidebarCollapsedWidthRem
              : nextDefaults.sidebarCollapsedWidthRem,
          };
        }),
      setWorkspaceFullscreen: (value) => set(() => ({ workspaceFullscreen: value })),
      toggleWorkspaceFullscreen: () =>
        set((state) => ({ workspaceFullscreen: !state.workspaceFullscreen })),
      resetSidebarWidths: () =>
        set((state) => ({
          sidebarWidthRem: state.defaults.sidebarWidthRem,
          sidebarCollapsedWidthRem: state.defaults.sidebarCollapsedWidthRem,
          hasUserCustomizedSidebarWidth: false,
          hasUserCustomizedSidebarCollapsedWidth: false,
        })),
    }),
    {
      name: 'layout:v2',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<LayoutStore> | undefined;
        const defaults = resolveLayoutDefaults(persisted?.defaults);

        return {
          ...currentState,
          ...persisted,
          defaults,
          sidebarWidthRem: clampSidebarWidth(
            persisted?.sidebarWidthRem ?? defaults.sidebarWidthRem,
            defaults.sidebarWidthRem,
            MIN_SIDEBAR_WIDTH_REM,
            MAX_SIDEBAR_WIDTH_REM,
          ),
          sidebarCollapsedWidthRem: clampSidebarWidth(
            persisted?.sidebarCollapsedWidthRem ?? defaults.sidebarCollapsedWidthRem,
            defaults.sidebarCollapsedWidthRem,
            MIN_SIDEBAR_COLLAPSED_WIDTH_REM,
            MAX_SIDEBAR_COLLAPSED_WIDTH_REM,
          ),
          hasUserCustomizedSidebarWidth: persisted?.hasUserCustomizedSidebarWidth ?? false,
          hasUserCustomizedSidebarCollapsedWidth:
            persisted?.hasUserCustomizedSidebarCollapsedWidth ?? false,
        };
      },
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        expandedMenuIds: state.expandedMenuIds,
        sidebarWidthRem: state.sidebarWidthRem,
        sidebarCollapsedWidthRem: state.sidebarCollapsedWidthRem,
        defaults: state.defaults,
        hasUserCustomizedSidebarWidth: state.hasUserCustomizedSidebarWidth,
        hasUserCustomizedSidebarCollapsedWidth: state.hasUserCustomizedSidebarCollapsedWidth,
      }),
    },
  ),
);
