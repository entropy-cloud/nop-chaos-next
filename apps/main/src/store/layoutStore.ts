import { layoutConfig } from '../config/layout';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface LayoutStore {
  sidebarCollapsed: boolean;
  expandedMenuIds: string[];
  sidebarWidthRem: number;
  sidebarCollapsedWidthRem: number;
  workspaceFullscreen: boolean;
  toggleSidebar: () => void;
  toggleMenuGroup: (id: string) => void;
  setSidebarWidthRem: (value: number) => void;
  setSidebarCollapsedWidthRem: (value: number) => void;
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

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      expandedMenuIds: ['flow-editor', 'data-management', 'plugins', 'settings', 'help'],
      sidebarWidthRem: layoutConfig.sidebarWidthRem,
      sidebarCollapsedWidthRem: layoutConfig.sidebarCollapsedWidthRem,
      workspaceFullscreen: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleMenuGroup: (id) =>
        set((state) => ({
          expandedMenuIds: state.expandedMenuIds.includes(id)
            ? state.expandedMenuIds.filter((item) => item !== id)
            : [...state.expandedMenuIds, id],
        })),
      setSidebarWidthRem: (value) =>
        set(() => ({
          sidebarWidthRem: clampSidebarWidth(value, layoutConfig.sidebarWidthRem, 14, 28),
        })),
      setSidebarCollapsedWidthRem: (value) =>
        set(() => ({
          sidebarCollapsedWidthRem: clampSidebarWidth(
            value,
            layoutConfig.sidebarCollapsedWidthRem,
            4,
            8,
          ),
        })),
      setWorkspaceFullscreen: (value) => set(() => ({ workspaceFullscreen: value })),
      toggleWorkspaceFullscreen: () =>
        set((state) => ({ workspaceFullscreen: !state.workspaceFullscreen })),
      resetSidebarWidths: () =>
        set(() => ({
          sidebarWidthRem: layoutConfig.sidebarWidthRem,
          sidebarCollapsedWidthRem: layoutConfig.sidebarCollapsedWidthRem,
        })),
    }),
    {
      name: 'layout:v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        expandedMenuIds: state.expandedMenuIds,
        sidebarWidthRem: state.sidebarWidthRem,
        sidebarCollapsedWidthRem: state.sidebarCollapsedWidthRem,
      }),
    },
  ),
);
