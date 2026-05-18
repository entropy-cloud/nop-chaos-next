import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PluginManifest } from '@nop-chaos/shared';
import { getPluginSeeds } from '../services/mockApi';

function mergePluginManifests(basePlugins: PluginManifest[], overrides: PluginManifest[] = []): PluginManifest[] {
  const merged = new Map(basePlugins.map((plugin) => [plugin.id, plugin]));

  for (const override of overrides) {
    const current = merged.get(override.id);
    merged.set(override.id, current ? { ...current, ...override } : override);
  }

  return Array.from(merged.values());
}

interface PluginStore {
  plugins: PluginManifest[];
  setPlugins: (plugins: PluginManifest[]) => void;
  updatePlugin: (pluginId: string, updater: (plugin: PluginManifest) => PluginManifest) => void;
}

const initialPlugins = getPluginSeeds();

export const usePluginStore = create<PluginStore>()(
  persist(
    (set) => ({
      plugins: initialPlugins,
      setPlugins: (plugins) => {
        set({ plugins });
      },
      updatePlugin: (pluginId, updater) =>
        set((state) => {
          const nextPlugins = state.plugins.map((plugin) =>
            plugin.id === pluginId ? updater(plugin) : plugin,
          );
          return { plugins: nextPlugins };
        }),
    }),
    {
      name: 'plugins:v1',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<PluginStore> | undefined;
        const persistedPlugins = persisted?.plugins;

        if (!persistedPlugins) {
          return currentState;
        }

        return {
          ...currentState,
          ...persisted,
          plugins: mergePluginManifests(currentState.plugins, persistedPlugins),
        };
      },
    },
  ),
);

export { mergePluginManifests };
