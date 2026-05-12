import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AppTab } from '@nop-chaos/shared';

const homeTab: AppTab = {
  path: '/dashboard',
  title: 'Dashboard',
  icon: 'layout-dashboard',
  closable: false,
};

interface TabStore {
  tabs: AppTab[];
  activePath: string;
  openTab: (tab: AppTab) => void;
  setActivePath: (path: string) => void;
  closeTab: (path: string) => string;
  closeOtherTabs: (path: string) => void;
  closeAllTabs: () => void;
}

export const useTabStore = create<TabStore>()(
  persist(
    (set) => ({
      tabs: [homeTab],
      activePath: homeTab.path,
      openTab: (tab) =>
        set((state) => ({
          activePath: tab.path,
          tabs: state.tabs.some((item) => item.path === tab.path)
            ? state.tabs
            : [...state.tabs, tab],
        })),
      setActivePath: (path) => set({ activePath: path }),
      closeTab: (path) => {
        let nextPath = homeTab.path;
        set((state) => {
          const currentIndex = state.tabs.findIndex((item) => item.path === path);
          const nextTabs = state.tabs.filter(
            (item) => item.path !== path || item.closable === false,
          );
          const candidate = nextTabs[currentIndex] ?? nextTabs[currentIndex - 1] ?? homeTab;
          nextPath = candidate.path;
          return {
            tabs: nextTabs.length > 0 ? nextTabs : [homeTab],
            activePath: state.activePath === path ? nextPath : state.activePath,
          };
        });
        return nextPath;
      },
      closeOtherTabs: (path) =>
        set((state) => ({
          tabs: state.tabs.filter((item) => item.closable === false || item.path === path),
          activePath: path,
        })),
      closeAllTabs: () => set({ tabs: [homeTab], activePath: homeTab.path }),
    }),
    {
      name: 'tabs:v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
