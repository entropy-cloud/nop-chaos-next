import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ThemeConfig, PluginManifest, User } from '@nop-chaos/shared';
import * as React from 'react';
import {
  getPluginBridge,
  getPluginBridgeSnapshot,
  setPluginBridge,
  subscribePluginBridge,
  type PluginBridge,
} from './index';
import {
  usePluginBridge,
  usePluginBridgeSnapshot,
  usePluginThemeConfig,
  usePluginUser,
  usePluginManifest,
  usePluginI18n,
  usePluginNotifications,
} from './index';

const hostKey = '__NOP_PLUGIN_BRIDGE__';
const listenersKey = '__NOP_PLUGIN_BRIDGE_LISTENERS__';

function createBridge(): PluginBridge {
  const themeConfig: ThemeConfig = { themeId: 'classic', displayMode: 'light' };

  return {
    i18n: {
      language: 'en-US',
      t: (key: string) => key,
    } as PluginBridge['i18n'],
    notifications: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
    stores: {
      authStore: Object.assign(() => ({ user: null, isAuthenticated: false }), {
        getState: () => ({ user: null, isAuthenticated: false }),
        subscribe: () => () => undefined,
      }),
      themeStore: Object.assign(() => ({ themeConfig }), {
        getState: () => ({ themeConfig }),
        subscribe: () => () => undefined,
      }),
      pluginStore: Object.assign(() => ({ plugins: [] }), {
        getState: () => ({ plugins: [] }),
        subscribe: () => () => undefined,
      }),
    },
    navigate: vi.fn(),
    getCurrentUser: () => null,
    getCurrentPath: () => '/dashboard',
    getThemeConfig: () => themeConfig,
    getPluginManifest: () => undefined,
    subscribe: () => () => undefined,
    getSnapshot: () => ({
      i18n: {
        language: 'en-US',
        t: (key: string) => key,
      } as PluginBridge['i18n'],
      themeConfig,
      user: null,
      plugins: [],
    }),
  };
}

describe('plugin bridge', () => {
  beforeEach(() => {
    delete (globalThis as typeof globalThis & { [hostKey]?: PluginBridge })[hostKey];
    delete (globalThis as typeof globalThis & { [listenersKey]?: Set<() => void> })[listenersKey];
  });

  it('stores and returns the active bridge', () => {
    const bridge = createBridge();

    setPluginBridge(bridge);

    expect(getPluginBridge()).toBe(bridge);
  });

  it('preserves host navigation handlers', () => {
    const bridge = createBridge();

    setPluginBridge(bridge);
    getPluginBridge()?.navigate('/plugins/management', { replace: true });

    expect(bridge.navigate).toHaveBeenCalledWith('/plugins/management', { replace: true });
  });

  it('notifies bridge subscribers when host bridge updates', () => {
    const listener = vi.fn();
    const unsubscribe = subscribePluginBridge(listener);

    setPluginBridge(createBridge());

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it('returns a stable fallback snapshot when bridge is missing', () => {
    const snapshot = getPluginBridgeSnapshot();
    const nextSnapshot = getPluginBridgeSnapshot();

    expect(snapshot.themeConfig.themeId).toBe('classic');
    expect(snapshot.user).toBeNull();
    expect(snapshot.plugins).toEqual([]);
    expect(snapshot.i18n.t('demo.key')).toBe('demo.key');
    expect(nextSnapshot).toBe(snapshot);
  });

  it('does not clone bridge snapshots on repeated reads', () => {
    const snapshot = {
      i18n: {
        language: 'en-US',
        t: (key: string) => key,
      } as PluginBridge['i18n'],
      themeConfig: { themeId: 'classic', displayMode: 'light' } as ThemeConfig,
      user: null,
      plugins: [],
    };
    const bridge = {
      ...createBridge(),
      getSnapshot: () => snapshot,
    } satisfies PluginBridge;

    setPluginBridge(bridge);

    expect(getPluginBridgeSnapshot()).toBe(snapshot);
    expect(getPluginBridgeSnapshot()).toBe(snapshot);
  });

  it('returns stable fallback theme and i18n references when bridge is missing', () => {
    const firstSnapshot = getPluginBridgeSnapshot();
    const secondSnapshot = getPluginBridgeSnapshot();

    expect(firstSnapshot.themeConfig).toBe(secondSnapshot.themeConfig);
    expect(firstSnapshot.i18n).toBe(secondSnapshot.i18n);
    expect(firstSnapshot.themeConfig.themeId).toBe('classic');
    expect(firstSnapshot.i18n.t('demo.key')).toBe('demo.key');
  });
});

vi.mock('react', () => ({
  useSyncExternalStore: vi.fn(<T>(subscribe: (listener: () => void) => () => void, getSnapshot: () => T) => {
    subscribe(() => {});
    return getSnapshot();
  }),
}));

function createBridgeWithUser(user: User | null = null): PluginBridge {
  const themeConfig: ThemeConfig = { themeId: 'ocean', displayMode: 'dark' };

  return {
    i18n: {
      language: 'zh-CN',
      t: (key: string) => `[${key}]`,
    } as PluginBridge['i18n'],
    notifications: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
    stores: {
      authStore: Object.assign(() => ({ user, isAuthenticated: user !== null }), {
        getState: () => ({ user, isAuthenticated: user !== null }),
        subscribe: () => () => undefined,
      }),
      themeStore: Object.assign(() => ({ themeConfig }), {
        getState: () => ({ themeConfig }),
        subscribe: () => () => undefined,
      }),
      pluginStore: Object.assign(() => ({ plugins: [] }), {
        getState: () => ({ plugins: [] }),
        subscribe: () => () => undefined,
      }),
    },
    navigate: vi.fn(),
    getCurrentUser: () => user,
    getCurrentPath: () => '/test',
    getThemeConfig: () => themeConfig,
    getPluginManifest: () => undefined,
    subscribe: () => () => undefined,
    getSnapshot: () => ({
      i18n: {
        language: 'zh-CN',
        t: (key: string) => `[${key}]`,
      } as PluginBridge['i18n'],
      themeConfig,
      user,
      plugins: [],
    }),
  };
}

describe('plugin bridge hooks', () => {
  beforeEach(() => {
    delete (globalThis as typeof globalThis & { [hostKey]?: PluginBridge })[hostKey];
    delete (globalThis as typeof globalThis & { [listenersKey]?: Set<() => void> })[listenersKey];
  });

  describe('usePluginBridge', () => {
    it('returns undefined when no bridge is set', () => {
      expect(usePluginBridge()).toBeUndefined();
    });

    it('returns the bridge after injection', () => {
      const bridge = createBridge();

      setPluginBridge(bridge);

      expect(usePluginBridge()).toBe(bridge);
    });

    it('uses subscribePluginBridge for subscribe and getPluginBridge for snapshot', () => {
      const mockFn = React.useSyncExternalStore as ReturnType<typeof vi.fn>;

      usePluginBridge();

      expect(mockFn).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        expect.any(Function),
      );

      const args = mockFn.mock.calls[mockFn.mock.calls.length - 1];
      expect(args[0]).toBe(subscribePluginBridge);
      expect(args[1]).toBe(getPluginBridge);
      expect(args[2]).toBe(getPluginBridge);
    });
  });

  describe('usePluginBridgeSnapshot', () => {
    it('returns fallback snapshot when no bridge is set', () => {
      const snapshot = usePluginBridgeSnapshot();

      expect(snapshot.themeConfig.themeId).toBe('classic');
      expect(snapshot.user).toBeNull();
      expect(snapshot.plugins).toEqual([]);
    });

    it('returns bridge snapshot after injection', () => {
      const bridge = createBridgeWithUser();

      setPluginBridge(bridge);

      const snapshot = usePluginBridgeSnapshot();
      expect(snapshot.themeConfig.themeId).toBe('ocean');
      expect(snapshot.themeConfig.displayMode).toBe('dark');
      expect(snapshot.i18n.language).toBe('zh-CN');
    });
  });

  describe('usePluginThemeConfig', () => {
    it('returns fallback theme when no bridge is set', () => {
      const config = usePluginThemeConfig();

      expect(config.themeId).toBe('classic');
      expect(config.displayMode).toBe('light');
    });

    it('returns bridge theme after injection', () => {
      setPluginBridge(createBridgeWithUser());

      const config = usePluginThemeConfig();
      expect(config.themeId).toBe('ocean');
      expect(config.displayMode).toBe('dark');
    });
  });

  describe('usePluginUser', () => {
    it('returns null when no bridge is set', () => {
      expect(usePluginUser()).toBeNull();
    });

    it('returns user from bridge snapshot', () => {
      const user: User = {
        id: 'user-1',
        username: 'testuser',
        roles: ['admin'],
      };
      const bridge = createBridgeWithUser(user);

      setPluginBridge(bridge);

      expect(usePluginUser()).toEqual(user);
    });
  });

  describe('usePluginManifest', () => {
    it('returns undefined when no matching plugin exists', () => {
      setPluginBridge(createBridge());

      expect(usePluginManifest('nonexistent')).toBeUndefined();
    });

    it('returns matching plugin manifest', () => {
      const manifest: PluginManifest = {
        id: 'plugin-a',
        name: 'Plugin A',
        icon: 'puzzle',
        description: 'A test plugin',
        version: '1.0.0',
        author: 'test',
        source: 'local',
        enabled: true,
        url: 'http://localhost/plugin-a.js',
        updatedAt: '2026-01-01',
      };
      const bridge: PluginBridge = {
        ...createBridge(),
        getSnapshot: () => ({
          i18n: createBridge().getSnapshot().i18n,
          themeConfig: { themeId: 'classic', displayMode: 'light' },
          user: null,
          plugins: [manifest],
        }),
      };

      setPluginBridge(bridge);

      expect(usePluginManifest('plugin-a')).toBe(manifest);
    });
  });

  describe('usePluginI18n', () => {
    it('returns fallback i18n when no bridge is set', () => {
      const i18n = usePluginI18n();

      expect(i18n.language).toBe('en-US');
      expect(i18n.t('key')).toBe('key');
    });

    it('returns bridge i18n after injection', () => {
      setPluginBridge(createBridgeWithUser());

      const i18n = usePluginI18n();
      expect(i18n.language).toBe('zh-CN');
      expect(i18n.t('hello')).toBe('[hello]');
    });
  });

  describe('usePluginNotifications', () => {
    it('returns fallback notification methods when no bridge is set', () => {
      const notifications = usePluginNotifications();

      expect(notifications.success).toBeInstanceOf(Function);
      expect(notifications.error).toBeInstanceOf(Function);
      expect(notifications.info).toBeInstanceOf(Function);

      expect(notifications.success('test')).toBeUndefined();
      expect(notifications.error('test')).toBeUndefined();
      expect(notifications.info('test')).toBeUndefined();
    });

    it('returns bridge notifications after injection', () => {
      const bridge = createBridge();

      setPluginBridge(bridge);

      const notifications = usePluginNotifications();
      notifications.success('ok');

      expect(bridge.notifications.success).toHaveBeenCalledWith('ok');
    });
  });
});
