import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AppTab } from '@nop-chaos/shared';
import { getCurrentHomePath } from '../config/homePath';

function createHomeTab(): AppTab {
  return {
    path: getCurrentHomePath(),
    title: 'Dashboard',
    icon: 'layout-dashboard',
    closable: false,
  };
}

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
      tabs: [createHomeTab()],
      activePath: getCurrentHomePath(),
      openTab: (tab) =>
        set((state) => ({
          activePath: tab.path,
          tabs: state.tabs.some((item) => item.path === tab.path)
            ? state.tabs
            : [...state.tabs, tab],
        })),
      setActivePath: (path) => set({ activePath: path }),
      closeTab: (path) => {
        let nextPath = getCurrentHomePath();
        set((state) => {
          const homeTab = createHomeTab();
          const currentIndex = state.tabs.findIndex((item) => item.path === path);

          if (currentIndex < 0) {
            nextPath = state.activePath;
            return { tabs: state.tabs, activePath: state.activePath };
          }

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
        set((state) => {
          const homeTab = createHomeTab();
          const keptTabs = state.tabs.filter((item) => item.closable === false || item.path === path);
          const homeAwareTabs = keptTabs.some((item) => item.path === homeTab.path)
            ? keptTabs.map((item) => (item.closable === false ? homeTab : item))
            : [homeTab, ...keptTabs.filter((item) => item.path !== homeTab.path)];

          return {
            tabs: homeAwareTabs,
            activePath: path,
          };
        }),
      closeAllTabs: () => {
        const homeTab = createHomeTab();
        set({ tabs: [homeTab], activePath: homeTab.path });
      },
    }),
    {
      name: 'tabs:v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
