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

  it('toggles menu group expands and collapses IDs', async () => {
    const { useLayoutStore } = await import('./layoutStore');

    expect(useLayoutStore.getState().expandedMenuIds).toContain('flow-editor');

    useLayoutStore.getState().toggleMenuGroup('flow-editor');
    expect(useLayoutStore.getState().expandedMenuIds).not.toContain('flow-editor');

    useLayoutStore.getState().toggleMenuGroup('flow-editor');
    expect(useLayoutStore.getState().expandedMenuIds).toContain('flow-editor');
  });

  it('clamps sidebar width to configured min/max bounds', async () => {
    const { useLayoutStore } = await import('./layoutStore');

    useLayoutStore.getState().setSidebarWidthRem(1);
    expect(useLayoutStore.getState().sidebarWidthRem).toBe(14);

    useLayoutStore.getState().setSidebarWidthRem(99);
    expect(useLayoutStore.getState().sidebarWidthRem).toBe(28);
  });

  it('clamps sidebar collapsed width to configured min/max bounds', async () => {
    const { useLayoutStore } = await import('./layoutStore');

    useLayoutStore.getState().setSidebarCollapsedWidthRem(1);
    expect(useLayoutStore.getState().sidebarCollapsedWidthRem).toBe(4);

    useLayoutStore.getState().setSidebarCollapsedWidthRem(99);
    expect(useLayoutStore.getState().sidebarCollapsedWidthRem).toBe(8);
  });

  it('restores persisted sidebar fields when merge receives valid snapshot', async () => {
    localStorageMock.setItem(
      'layout:v2',
      JSON.stringify({
        state: {
          sidebarCollapsed: true,
          expandedMenuIds: ['flow-editor'],
          sidebarWidthRem: 18,
          sidebarCollapsedWidthRem: 6,
          defaults: { sidebarWidthRem: 16, sidebarCollapsedWidthRem: 5 },
          hasUserCustomizedSidebarWidth: true,
          hasUserCustomizedSidebarCollapsedWidth: true,
        },
        version: 0,
      }),
    );

    const { useLayoutStore } = await import('./layoutStore');

    expect(useLayoutStore.getState().sidebarCollapsed).toBe(true);
    expect(useLayoutStore.getState().sidebarWidthRem).toBe(18);
    expect(useLayoutStore.getState().sidebarCollapsedWidthRem).toBe(6);
    expect(useLayoutStore.getState().hasUserCustomizedSidebarWidth).toBe(true);
  });

  it('falls back to defaults when persisted sidebar widths are out of range', async () => {
    localStorageMock.setItem(
      'layout:v2',
      JSON.stringify({
        state: {
          sidebarCollapsed: false,
          expandedMenuIds: [],
          sidebarWidthRem: 99,
          sidebarCollapsedWidthRem: 99,
          defaults: { sidebarWidthRem: 16, sidebarCollapsedWidthRem: 5 },
          hasUserCustomizedSidebarWidth: true,
          hasUserCustomizedSidebarCollapsedWidth: true,
        },
        version: 0,
      }),
    );

    const { useLayoutStore } = await import('./layoutStore');

    expect(useLayoutStore.getState().sidebarWidthRem).toBe(28);
    expect(useLayoutStore.getState().sidebarCollapsedWidthRem).toBe(8);
  });
});
