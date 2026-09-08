// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

type TabStoreHook = typeof import('./tabStore').useTabStore;
type HomePathModule = typeof import('../config/homePath');

describe('tabStore', () => {
  let useTabStore: TabStoreHook;
  let homePath: HomePathModule;

  beforeEach(async () => {
    localStorageMock.clear();
    vi.resetModules();
    homePath = await import('../config/homePath');
    homePath.resetCurrentHomePath();
    ({ useTabStore } = await import('./tabStore'));
    useTabStore.setState({
      tabs: [{ path: '/dashboard', title: 'Dashboard', icon: 'layout-dashboard', closable: false }],
      activePath: '/dashboard',
    });
  });

  it('keeps active path when closing a missing tab', () => {
    const nextPath = useTabStore.getState().closeTab('/missing');

    expect(nextPath).toBe('/dashboard');
    expect(useTabStore.getState().activePath).toBe('/dashboard');
    expect(useTabStore.getState().tabs).toHaveLength(1);
  });

  it('activates the next available tab when closing the current tab', () => {
    useTabStore.getState().openTab({ path: '/settings', title: 'Settings', icon: 'settings', closable: true });
    useTabStore.getState().openTab({ path: '/settings/theme', title: 'Theme', icon: 'palette', closable: true });

    const nextPath = useTabStore.getState().closeTab('/settings/theme');

    expect(nextPath).toBe('/settings');
    expect(useTabStore.getState().activePath).toBe('/settings');
    expect(useTabStore.getState().tabs.map((tab) => tab.path)).toEqual(['/dashboard', '/settings']);
  });

  it('preserves the non-closable home tab when asked to close it', () => {
    const nextPath = useTabStore.getState().closeTab('/dashboard');

    expect(nextPath).toBe('/dashboard');
    expect(useTabStore.getState().tabs).toEqual([
      { path: '/dashboard', title: 'Dashboard', icon: 'layout-dashboard', closable: false },
    ]);
  });

  it('keeps only home and selected tab when closing other tabs', () => {
    useTabStore.getState().openTab({ path: '/settings', title: 'Settings', icon: 'settings', closable: true });
    useTabStore.getState().openTab({ path: '/settings/theme', title: 'Theme', icon: 'palette', closable: true });

    useTabStore.getState().closeOtherTabs('/settings');

    expect(useTabStore.getState().tabs.map((tab) => tab.path)).toEqual(['/dashboard', '/settings']);
    expect(useTabStore.getState().activePath).toBe('/settings');
  });

  it('resets to the canonical home tab when closing all tabs', () => {
    homePath.setCurrentHomePath('/settings');
    useTabStore.getState().openTab({ path: '/settings/theme', title: 'Theme', icon: 'palette', closable: true });

    useTabStore.getState().closeAllTabs();

    expect(useTabStore.getState().tabs).toEqual([
      { path: '/settings', title: 'Dashboard', icon: 'layout-dashboard', closable: false },
    ]);
    expect(useTabStore.getState().activePath).toBe('/settings');
  });

  it('replaces the legacy non-closable home tab when a new canonical home tab is opened', () => {
    homePath.setCurrentHomePath('/settings');

    useTabStore.getState().openTab({
      path: '/settings',
      title: 'Settings',
      icon: 'settings',
      closable: false,
    });

    expect(useTabStore.getState().tabs).toEqual([
      { path: '/settings', title: 'Settings', icon: 'settings', closable: false },
    ]);
  });
});
