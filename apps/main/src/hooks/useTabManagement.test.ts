// @vitest-environment happy-dom
import { act, createElement, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { resetCurrentHomePath, setCurrentHomePath } from '../config/homePath';
import { useTabManagement } from './useTabManagement';

const mockNavigate = vi.fn();
const mockOpenTab = vi.fn();
const mockSetActivePath = vi.fn();
const mockCloseTab = vi.fn();
const mockCloseOtherTabs = vi.fn();
const mockCloseAllTabs = vi.fn();
const tabStoreState = {
  tabs: [{ path: '/dashboard', title: 'Dashboard', icon: 'layout-dashboard', closable: false }],
  activePath: '/dashboard',
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../store/tabStore', () => ({
  useTabStore: (selector: (state: {
    tabs: typeof tabStoreState.tabs;
    activePath: string;
    openTab: typeof mockOpenTab;
    setActivePath: typeof mockSetActivePath;
    closeTab: typeof mockCloseTab;
    closeOtherTabs: typeof mockCloseOtherTabs;
    closeAllTabs: typeof mockCloseAllTabs;
  }) => unknown) =>
    selector({
      ...tabStoreState,
      openTab: mockOpenTab,
      setActivePath: mockSetActivePath,
      closeTab: mockCloseTab,
      closeOtherTabs: mockCloseOtherTabs,
      closeAllTabs: mockCloseAllTabs,
    }),
}));

describe('useTabManagement', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    mockNavigate.mockReset();
    mockOpenTab.mockReset();
    mockSetActivePath.mockReset();
    mockCloseTab.mockReset();
    mockCloseOtherTabs.mockReset();
    mockCloseAllTabs.mockReset();
    resetCurrentHomePath();
    tabStoreState.tabs = [
      { path: '/dashboard', title: 'Dashboard', icon: 'layout-dashboard', closable: false },
    ];
    tabStoreState.activePath = '/dashboard';
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  });

  it('navigates to the canonical home path on closeAllTabs', () => {
    setCurrentHomePath('/plugins');
    const hookRef: { current?: ReturnType<typeof useTabManagement> } = {};

    const wrapper = ({ children }: { children: ReactNode }) => (
      createElement(MemoryRouter, null, children)
    );

    function TestHarness() {
      const value = useTabManagement();

      useEffect(() => {
        hookRef.current = value;
      }, [value]);

      return null;
    }

    act(() => {
      root.render(createElement(wrapper, null, createElement(TestHarness)));
    });

    act(() => {
      hookRef.current?.closeAllTabs();
    });

    expect(mockCloseAllTabs).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith('/plugins');
  });
});
