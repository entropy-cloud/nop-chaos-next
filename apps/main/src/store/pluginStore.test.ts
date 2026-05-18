import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { PluginManifest } from '@nop-chaos/shared';

function makePlugin(overrides: Partial<PluginManifest> & { id: string }): PluginManifest {
  return {
    name: overrides.id,
    icon: 'file',
    description: '',
    version: '1.0.0',
    author: 'test',
    source: 'local',
    enabled: true,
    url: `http://example.com/${overrides.id}.js`,
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

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

vi.mock('../services/mockApi', () => ({
  getPluginSeeds: () => [makePlugin({ id: 'test-plugin', url: 'http://example.com/p.js' })],
  persistPluginSeeds: vi.fn(),
}));

describe('pluginStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.resetModules();
  });

  it('initializes with seed plugins', async () => {
    const { usePluginStore } = await import('./pluginStore');
    const state = usePluginStore.getState();
    expect(state.plugins).toHaveLength(1);
    expect(state.plugins[0].id).toBe('test-plugin');
  });

  it('setPlugins updates plugins without calling persistPluginSeeds directly', async () => {
    const { persistPluginSeeds } = await import('../services/mockApi');
    const { usePluginStore } = await import('./pluginStore');

    const newPlugins = [makePlugin({ id: 'new-plugin', enabled: false })];

    usePluginStore.getState().setPlugins(newPlugins);
    expect(usePluginStore.getState().plugins).toEqual(newPlugins);
    expect(persistPluginSeeds).not.toHaveBeenCalled();
  });

  it('updatePlugin modifies a single plugin', async () => {
    const { usePluginStore } = await import('./pluginStore');

    usePluginStore.getState().updatePlugin('test-plugin', (plugin) => ({
      ...plugin,
      enabled: false,
    }));

    const updated = usePluginStore.getState().plugins.find((p) => p.id === 'test-plugin');
    expect(updated?.enabled).toBe(false);
  });

  it('merges persisted plugins on top of the current plugin baseline by id', async () => {
    localStorageMock.setItem(
      'plugins:v1',
      JSON.stringify({
        state: {
          plugins: [makePlugin({ id: 'test-plugin', enabled: false, name: 'Persisted name' })],
        },
        version: 0,
      }),
    );

    const { usePluginStore } = await import('./pluginStore');

    expect(usePluginStore.getState().plugins).toEqual([
      expect.objectContaining({ id: 'test-plugin', enabled: false, name: 'Persisted name' }),
    ]);
  });

  it('keeps current baseline plugins when persisted storage adds new ids', async () => {
    localStorageMock.setItem(
      'plugins:v1',
      JSON.stringify({
        state: {
          plugins: [makePlugin({ id: 'extension-plugin', name: 'Extension plugin' })],
        },
        version: 0,
      }),
    );

    const { usePluginStore } = await import('./pluginStore');

    expect(usePluginStore.getState().plugins.map((plugin) => plugin.id)).toEqual([
      'test-plugin',
      'extension-plugin',
    ]);
  });
});
