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

describe('themeStore', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    vi.resetModules();
  });

  it('uses default themeId and displayMode before user interaction', async () => {
    const { useThemeStore } = await import('./themeStore');

    expect(useThemeStore.getState().themeConfig.themeId).toBe('classic');
    expect(useThemeStore.getState().themeConfig.displayMode).toBe('system');
  });

  it('changes themeId via setThemeId', async () => {
    const { useThemeStore } = await import('./themeStore');

    useThemeStore.getState().setThemeId('glass');

    expect(useThemeStore.getState().themeConfig.themeId).toBe('glass');
  });

  it('changes displayMode via setDisplayMode', async () => {
    const { useThemeStore } = await import('./themeStore');

    useThemeStore.getState().setDisplayMode('dark');

    expect(useThemeStore.getState().themeConfig.displayMode).toBe('dark');
  });

  it('normalizes persisted themeId on restoration', async () => {
    localStorageMock.setItem(
      'theme:v1',
      JSON.stringify({
        state: {
          themeConfig: { themeId: 'modern', displayMode: 'light' },
        },
        version: 0,
      }),
    );

    const { useThemeStore } = await import('./themeStore');

    expect(useThemeStore.getState().themeConfig.themeId).toBe('classic');
    expect(useThemeStore.getState().themeConfig.displayMode).toBe('light');
  });

  it('restores persisted displayMode alongside themeId', async () => {
    localStorageMock.setItem(
      'theme:v1',
      JSON.stringify({
        state: {
          themeConfig: { themeId: 'glass', displayMode: 'dark' },
        },
        version: 0,
      }),
    );

    const { useThemeStore } = await import('./themeStore');

    expect(useThemeStore.getState().themeConfig.themeId).toBe('glass');
    expect(useThemeStore.getState().themeConfig.displayMode).toBe('dark');
  });
});
