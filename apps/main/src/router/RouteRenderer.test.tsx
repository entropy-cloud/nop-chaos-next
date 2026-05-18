import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MenuItem } from '@nop-chaos/shared';

import { RouteRenderer, resolvePluginManifest } from './RouteRenderer';

const pluginSlotMock = vi.fn(({ url }: { url: string }) => <div>Plugin slot: {url}</div>);
let pluginsState: Array<{ id: string; url: string; enabled: boolean }> = [];

vi.mock('@nop-chaos/core', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => children,
  PluginSlot: (props: { url: string }) => pluginSlotMock(props),
  usePermissionGuard: () => true,
}));

vi.mock('@nop-chaos/ui', () => ({
  Card: ({ children }: { children: ReactNode }) => children,
  CardContent: ({ children }: { children: ReactNode }) => children,
  CardHeader: ({ children }: { children: ReactNode }) => children,
  CardTitle: ({ children }: { children: ReactNode }) => children,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { roles: ['admin'] } }),
}));

vi.mock('../plugins/sharedModules', () => ({
  ensurePluginSharedModules: vi.fn(),
}));

vi.mock('../store/pluginStore', () => ({
  usePluginStore: (selector: (state: { plugins: Array<{ id: string; url: string; enabled: boolean }> }) => unknown) =>
    selector({ plugins: pluginsState }),
}));

vi.mock('./pageRegistry', () => ({
  ForbiddenPage: () => <div>Forbidden</div>,
  ServerErrorPage: () => <div>Server error</div>,
  getBuiltinPage: () => null,
}));

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

describe('RouteRenderer iframe security', () => {
  beforeEach(() => {
    pluginsState = [];
    pluginSlotMock.mockClear();
  });

  it('renders iframe routes with the fixed sandbox allowlist', () => {
    const markup = renderToStaticMarkup(
      <RouteRenderer
        item={{
          id: 'iframe-page',
          title: 'Embedded',
          path: '/embedded',
          pageType: 'iframe',
          icon: 'frame',
          frameSrc: 'https://example.com/embed',
        }}
      />,
    );

    expect(markup).toContain('sandbox="allow-scripts allow-same-origin allow-forms allow-popups"');
    expect(markup).toContain('src="https://example.com/embed"');
  });

  it('resolves extension-registered plugin manifests for plugin routes', () => {
    pluginsState = [{ id: 'plugin-demo', url: '/plugins/plugin-demo.system.js', enabled: true }];

    const markup = renderToStaticMarkup(
      <RouteRenderer
        item={{
          id: 'plugins-demo-menu',
          title: 'Plugin Demo',
          path: '/plugins/demo',
          pageType: 'plugin',
          icon: 'puzzle',
          componentId: 'plugin-demo',
          pluginUrl: '/plugins/plugin-demo.system.js',
        }}
      />,
    );

    expect(markup).toContain('Plugin slot: /plugins/plugin-demo.system.js');
    expect(pluginSlotMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/plugins/plugin-demo.system.js' }),
    );
  });

  it('shows the disabled state when the matched plugin manifest is not enabled', () => {
    pluginsState = [{ id: 'plugin-demo', url: '/plugins/plugin-demo.system.js', enabled: false }];

    const markup = renderToStaticMarkup(
      <RouteRenderer
        item={{
          id: 'plugins-demo-menu',
          title: 'Plugin Demo',
          path: '/plugins/demo',
          pageType: 'plugin',
          icon: 'puzzle',
          componentId: 'plugin-demo',
          pluginUrl: '/plugins/plugin-demo.system.js',
        }}
      />,
    );

    expect(markup).toContain('route.pluginNotEnabled');
    expect(markup).toContain('route.pluginStatusDisabled');
  });
});
