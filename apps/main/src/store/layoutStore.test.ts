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

describe('layoutStore', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    vi.resetModules();
  });

  it('uses built-in defaults before extension sync', async () => {
    const { useLayoutStore } = await import('./layoutStore');

    expect(useLayoutStore.getState().sidebarWidthRem).toBe(16);
    expect(useLayoutStore.getState().sidebarCollapsedWidthRem).toBe(5);
  });

  it('applies extension defaults when user has not customized widths', async () => {
    const { useLayoutStore } = await import('./layoutStore');

    useLayoutStore.getState().syncSidebarDefaults({
      sidebarWidthRem: 15,
      sidebarCollapsedWidthRem: 4.5,
    });

    expect(useLayoutStore.getState().sidebarWidthRem).toBe(15);
    expect(useLayoutStore.getState().sidebarCollapsedWidthRem).toBe(4.5);
  });

  it('keeps user width overrides above extension defaults', async () => {
    const { useLayoutStore } = await import('./layoutStore');

    useLayoutStore.getState().setSidebarWidthRem(18);
    useLayoutStore.getState().setSidebarCollapsedWidthRem(6);
    useLayoutStore.getState().syncSidebarDefaults({
      sidebarWidthRem: 15,
      sidebarCollapsedWidthRem: 4.5,
    });

    expect(useLayoutStore.getState().sidebarWidthRem).toBe(18);
    expect(useLayoutStore.getState().sidebarCollapsedWidthRem).toBe(6);
  });

  it('reset restores the latest resolved defaults and clears user override flags', async () => {
    const { useLayoutStore } = await import('./layoutStore');

    useLayoutStore.getState().syncSidebarDefaults({
      sidebarWidthRem: 15,
      sidebarCollapsedWidthRem: 4.5,
    });
    useLayoutStore.getState().setSidebarWidthRem(18);
    useLayoutStore.getState().setSidebarCollapsedWidthRem(6);
    useLayoutStore.getState().resetSidebarWidths();

    expect(useLayoutStore.getState().sidebarWidthRem).toBe(15);
    expect(useLayoutStore.getState().sidebarCollapsedWidthRem).toBe(4.5);
    expect(useLayoutStore.getState().hasUserCustomizedSidebarWidth).toBe(false);
    expect(useLayoutStore.getState().hasUserCustomizedSidebarCollapsedWidth).toBe(false);
  });
});
