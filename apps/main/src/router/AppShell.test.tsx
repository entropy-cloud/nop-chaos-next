// @vitest-environment happy-dom
import { act, createElement, useEffect, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

vi.stubGlobal('localStorage', localStorageMock);

type TabStore = typeof import('../store/tabStore').useTabStore;
type HomePathModule = typeof import('../config/homePath');

describe('AppShell tab/URL sync', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let useTabStore: TabStore;
  let homePath: HomePathModule;

  beforeEach(async () => {
    localStorageMock.clear();
    vi.resetModules();
    homePath = await import('../config/homePath');
    homePath.resetCurrentHomePath();
    ({ useTabStore } = await import('../store/tabStore'));
    useTabStore.setState({
      tabs: [{ path: '/dashboard', title: 'Dashboard', icon: 'layout-dashboard', closable: false }],
      activePath: '/dashboard',
    });
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

  function SyncHarness() {
    const location = useLocation();
    const setActivePath = useTabStore((state) => state.setActivePath);

    useEffect(() => {
      setActivePath(location.pathname);
    }, [location.pathname, setActivePath]);

    return null;
  }

  function NavCapturer({
    onNavigate,
  }: {
    onNavigate: (navigate: ReturnType<typeof useNavigate>) => void;
  }) {
    const navigate = useNavigate();

    useEffect(() => {
      onNavigate(navigate);
    }, [navigate, onNavigate]);

    return null;
  }

  function renderInRouter(
    initialEntries: string[],
    initialIndex: number,
    ...children: ReactNode[]
  ) {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries, initialIndex },
        ...children,
      ),
    );
  }

  it('syncs activePath to initial location on mount', () => {
    act(() => {
      renderInRouter(['/plugins'], 0, createElement(SyncHarness));
    });

    expect(useTabStore.getState().activePath).toBe('/plugins');
  });

  it('syncs activePath when navigating forward in history', () => {
    const navRef: { current: ReturnType<typeof useNavigate> | null } = { current: null };

    act(() => {
      renderInRouter(
        ['/dashboard', '/plugins'],
        0,
        createElement(SyncHarness),
        createElement(NavCapturer, {
          onNavigate: (navigate) => {
            navRef.current = navigate;
          },
        }),
      );
    });

    expect(useTabStore.getState().activePath).toBe('/dashboard');

    act(() => {
      navRef.current?.(1);
    });

    expect(useTabStore.getState().activePath).toBe('/plugins');
  });

  it('syncs activePath when navigating backward in history', () => {
    const navRef: { current: ReturnType<typeof useNavigate> | null } = { current: null };

    act(() => {
      renderInRouter(
        ['/dashboard', '/plugins'],
        1,
        createElement(SyncHarness),
        createElement(NavCapturer, {
          onNavigate: (navigate) => {
            navRef.current = navigate;
          },
        }),
      );
    });

    expect(useTabStore.getState().activePath).toBe('/plugins');

    act(() => {
      navRef.current?.(-1);
    });

    expect(useTabStore.getState().activePath).toBe('/dashboard');
  });

  it('syncs activePath across multiple back-and-forward navigations', () => {
    const navRef: { current: ReturnType<typeof useNavigate> | null } = { current: null };

    act(() => {
      renderInRouter(
        ['/a', '/b', '/c'],
        2,
        createElement(SyncHarness),
        createElement(NavCapturer, {
          onNavigate: (navigate) => {
            navRef.current = navigate;
          },
        }),
      );
    });

    expect(useTabStore.getState().activePath).toBe('/c');

    act(() => {
      navRef.current?.(-1);
    });
    expect(useTabStore.getState().activePath).toBe('/b');

    act(() => {
      navRef.current?.(-1);
    });
    expect(useTabStore.getState().activePath).toBe('/a');

    act(() => {
      navRef.current?.(2);
    });
    expect(useTabStore.getState().activePath).toBe('/c');
  });
});
