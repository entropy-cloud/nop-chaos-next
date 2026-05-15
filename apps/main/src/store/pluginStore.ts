import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { PluginManifest } from '@nop-chaos/shared';
import { getPluginSeeds } from '../services/mockApi';

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
    },
  ),
);
