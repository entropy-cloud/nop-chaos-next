import { describe, expect, it } from 'vitest';
import type { MenuItem } from '@nop-chaos/shared';

function resolvePluginManifest(
  item: MenuItem,
  plugins: Array<{ id: string; url: string; enabled: boolean }>,
) {
  return (
    plugins.find((plugin) => plugin.id === item.componentId) ??
    plugins.find((plugin) => plugin.id === item.id) ??
    plugins.find((plugin) => plugin.url === item.pluginUrl)
  );
}

describe('resolvePluginManifest', () => {
  const plugins = [
    { id: 'plugin-a', url: 'http://example.com/a.js', enabled: true },
    { id: 'plugin-b', url: 'http://example.com/b.js', enabled: false },
  ];

  function makeItem(overrides: Partial<MenuItem> & { id: string }): MenuItem {
    return {
      path: `/${overrides.id}`,
      pageType: 'plugin',
      icon: 'file',
      ...overrides,
    };
  }

  it('resolves by componentId match', () => {
    const item = makeItem({ id: 'x', componentId: 'plugin-a', pluginUrl: 'http://example.com/a.js' });
    const result = resolvePluginManifest(item, plugins);
    expect(result?.id).toBe('plugin-a');
  });

  it('resolves by id fallback when componentId does not match', () => {
    const item = makeItem({ id: 'plugin-b', componentId: 'unknown', pluginUrl: 'http://example.com/b.js' });
    const result = resolvePluginManifest(item, plugins);
    expect(result?.id).toBe('plugin-b');
  });

  it('resolves by url when id and componentId do not match', () => {
    const item = makeItem({ id: 'unknown', componentId: 'unknown', pluginUrl: 'http://example.com/a.js' });
    const result = resolvePluginManifest(item, plugins);
    expect(result?.id).toBe('plugin-a');
  });

  it('returns undefined when no plugin matches', () => {
    const item = makeItem({ id: 'unknown', componentId: 'unknown', pluginUrl: 'http://example.com/c.js' });
    const result = resolvePluginManifest(item, plugins);
    expect(result).toBeUndefined();
  });
});
