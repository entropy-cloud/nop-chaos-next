import type { PluginManifest } from '@nop-chaos/shared';
import { readStoredJson, wait, writeStoredJson } from './shared';

const pluginStorageKey = 'plugins:manifests:v1';

export const seedPluginManifests: PluginManifest[] = [
  {
    id: 'plugins-demo',
    name: 'Plugin Demo',
    icon: 'blocks',
    description:
      'Runtime analytics extension rendered through SystemJS and shared shell capabilities.',
    version: '0.3.2',
    author: 'NOP Chaos Team',
    source: 'Internal registry',
    enabled: true,
    url: '/plugins/plugin-demo.system.js',
    updatedAt: '2026-03-15 09:30',
    configSchema: [
      {
        key: 'refreshInterval',
        label: 'Refresh interval',
        type: 'select',
        options: ['15s', '30s', '60s'],
        defaultValue: '30s',
      },
      { key: 'highlightThreshold', label: 'Highlight threshold', type: 'number', defaultValue: 85 },
      {
        key: 'reportTitle',
        label: 'Report title',
        type: 'text',
        defaultValue: 'Plugin operations lens',
      },
    ],
    settings: {
      refreshInterval: '30s',
      highlightThreshold: 85,
      reportTitle: 'Plugin operations lens',
    },
  },
];

export function getPluginSeeds(): PluginManifest[] {
  return readStoredJson(pluginStorageKey, seedPluginManifests);
}

export function persistPluginSeeds(value: PluginManifest[]) {
  writeStoredJson(pluginStorageKey, value);
}

export async function fetchPluginList(): Promise<PluginManifest[]> {
  return wait(getPluginSeeds(), 220);
}
