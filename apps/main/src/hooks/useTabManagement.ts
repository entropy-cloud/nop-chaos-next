import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppTab } from '@nop-chaos/shared';
import { getCurrentHomePath } from '../config/homePath';
import { useTabStore } from '../store/tabStore';

export function useTabManagement() {
  const navigate = useNavigate();
  const tabs = useTabStore((state) => state.tabs);
  const activePath = useTabStore((state) => state.activePath);
  const open = useTabStore((state) => state.openTab);
  const activate = useTabStore((state) => state.setActivePath);
  const close = useTabStore((state) => state.closeTab);
  const closeOthers = useTabStore((state) => state.closeOtherTabs);
  const closeAll = useTabStore((state) => state.closeAllTabs);

  return useMemo(
    () => ({
      tabs,
      activePath,
      openTab: (tab: AppTab) => {
        open(tab);
        navigate(tab.path);
      },
      setActivePath: (path: string) => {
        activate(path);
        navigate(path);
      },
      closeTab: (path: string) => {
        const nextPath = close(path);
        navigate(nextPath);
      },
      closeOtherTabs: (path: string) => {
        closeOthers(path);
        navigate(path);
      },
      closeAllTabs: () => {
        closeAll();
        navigate(getCurrentHomePath());
      },
    }),
    [activate, activePath, close, closeAll, closeOthers, navigate, open, tabs],
  );
}
