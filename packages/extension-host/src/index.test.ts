import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { LoadedExtension, ExtensionSource, MenuItem, ShellExtension } from '@nop-chaos/shared';
import { DEFAULT_EXTENSION_TIMEOUT_MS, loadExtensions } from './loadExtensions';
import {
  resolveShellRuntimeConfig,
  setLoadedExtensions,
  getLoadedExtensions,
  mergeExtensionMenus,
  resolveExtensionUserMenuItems,
  hasMenuOverride,
  setShellRuntimeConfig,
  getShellRuntimeConfig,
  getExtensionDefaultHomePath,
  getSystemPageComponentId
} from './runtime';

describe('extension-host loadExtensions', () => {
  it('loads extensions from sources', async () => {
    const extension = { id: 'test-ext' };
    const loaded = await loadExtensions({
      sources: [
        { id: 'test-ext', load: async () => ({ default: extension }) },
      ],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      },
    });

    expect(loaded).toHaveLength(1);
    expect(loaded[0].extension.id).toBe('test-ext');
  });

  it('skips disabled extensions', async () => {
    const loaded = await loadExtensions({
      sources: [
        { id: 'disabled-ext', load: async () => ({ default: { id: 'disabled-ext' } }), enabled: false },
        { id: 'enabled-ext', load: async () => ({ default: { id: 'enabled-ext' } }) },
      ],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      },
    });

    expect(loaded).toHaveLength(1);
    expect(loaded[0].extension.id).toBe('enabled-ext');
  });

  it('handles extension load failure gracefully', async () => {
    const errorSpy = vi.fn();
    const loaded = await loadExtensions({
      sources: [
        { id: 'fail-ext', load: async () => { throw new Error('load failed'); } },
        { id: 'ok-ext', load: async () => ({ default: { id: 'ok-ext' } }) },
      ],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: errorSpy },
      },
    });

    expect(loaded).toHaveLength(1);
    expect(loaded[0].extension.id).toBe('ok-ext');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('rejects protocol-based extension entries', async () => {
    const errorSpy = vi.fn();
    const loaded = await loadExtensions({
      sources: [{ id: 'remote-ext', entry: 'https://example.com/extension.js' }],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: errorSpy },
      },
    });

    expect(loaded).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Only relative same-origin paths are allowed: https://example.com/extension.js'),
    );
  });

  it('resolves extension from mod.extension field', async () => {
    const extension: ShellExtension = { id: 'ext-field' };
    const loaded = await loadExtensions({
      sources: [
        { id: 'ext-field', load: async () => ({ extension }) },
      ],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      },
    });

    expect(loaded).toHaveLength(1);
    expect(loaded[0].extension.id).toBe('ext-field');
  });

  it('resolves extension from mod.getExtension function', async () => {
    const extension: ShellExtension = { id: 'getter-ext' };
    const loaded = await loadExtensions({
      sources: [
        { id: 'getter-ext', load: async () => ({ getExtension: () => extension }) },
      ],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      },
    });

    expect(loaded).toHaveLength(1);
    expect(loaded[0].extension.id).toBe('getter-ext');
  });

  it('logs error when module has no valid export', async () => {
    const errorSpy = vi.fn();
    const loaded = await loadExtensions({
      sources: [
        { id: 'empty-mod', load: async () => ({}) },
      ],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: errorSpy },
      },
    });

    expect(loaded).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('empty-mod'));
  });

  it('calls extension.setup with context', async () => {
    const setup = vi.fn(async () => {});
    const loaded = await loadExtensions({
      sources: [
        { id: 'setup-ext', load: async () => ({ default: { id: 'setup-ext', setup } }) },
      ],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      },
    });

    expect(loaded).toHaveLength(1);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(setup).toHaveBeenCalledWith(expect.objectContaining({ logger: expect.any(Object) }));
  });

  it('sorts extensions by order', async () => {
    const loaded = await loadExtensions({
      sources: [
        { id: 'c', load: async () => ({ default: { id: 'c', order: 10 } }) },
        { id: 'a', load: async () => ({ default: { id: 'a', order: 1 } }) },
        { id: 'b', load: async () => ({ default: { id: 'b', order: 5 } }) },
      ],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      },
    });

    expect(loaded.map((e) => e.extension.id)).toEqual(['a', 'b', 'c']);
  });

  it('handles non-Error thrown from load', async () => {
    const errorSpy = vi.fn();
    const loaded = await loadExtensions({
      sources: [
        { id: 'string-error', load: async () => { throw 'string error'; } },
      ],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: errorSpy },
      },
    });

    expect(loaded).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown extension load error'));
  });

  it('normalizes extension that exports object without id', async () => {
    const errorSpy = vi.fn();
    const loaded = await loadExtensions({
      sources: [
        { id: 'no-id', load: async () => ({ default: { name: 'missing id' } } as any) },
      ],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: errorSpy },
      },
    });

    expect(loaded).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('must export a valid ShellExtension contract'));
  });

  it('resolves extension from async getExtension', async () => {
    const extension: ShellExtension = { id: 'async-getter' };
    const loaded = await loadExtensions({
      sources: [
        { id: 'async-getter', load: async () => ({ getExtension: async () => extension }) },
      ],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      },
    });

    expect(loaded).toHaveLength(1);
    expect(loaded[0].extension.id).toBe('async-getter');
  });

  it('times out stuck extension loads without blocking later sources forever', async () => {
    vi.useFakeTimers();
    const errorSpy = vi.fn();

    const loadPromise = loadExtensions({
      sources: [
        { id: 'stuck', load: async () => new Promise(() => undefined) },
        { id: 'ok-ext', load: async () => ({ default: { id: 'ok-ext' } }) },
      ],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: errorSpy },
      },
    });

    await vi.advanceTimersByTimeAsync(DEFAULT_EXTENSION_TIMEOUT_MS + 1);
    const loaded = await loadPromise;

    expect(loaded).toHaveLength(1);
    expect(loaded[0].extension.id).toBe('ok-ext');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('load timed out'));
    vi.useRealTimers();
  });

  it('rejects invalid supportedLanguages contract', async () => {
    const errorSpy = vi.fn();
    const loaded = await loadExtensions({
      sources: [{ id: 'bad-languages', load: async () => ({ default: { id: 'bad-languages', supportedLanguages: [{}] } as never }) }],
      context: {
        logger: { info: vi.fn(), warn: vi.fn(), error: errorSpy },
      },
    });

    expect(loaded).toHaveLength(0);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('valid ShellExtension contract'));
  });
});

function makeSource(id: string): ExtensionSource {
  return { id, load: async () => ({ default: { id } }) };
}

function makeMenuItem(overrides: Partial<MenuItem> & { id: string; path: string }): MenuItem {
  return {
    title: overrides.id,
    pageType: 'builtin',
    componentId: overrides.id,
    icon: 'file',
    ...overrides,
  };
}

describe('extension-host runtime', () => {
  beforeEach(() => {
    setLoadedExtensions([]);
  });

  it('manages loaded extensions lifecycle', () => {
    const ext: LoadedExtension = { source: makeSource('test'), extension: { id: 'test' } };
    setLoadedExtensions([ext]);
    expect(getLoadedExtensions()).toHaveLength(1);

    setLoadedExtensions([]);
    expect(getLoadedExtensions()).toHaveLength(0);
  });

  it('resolves shell runtime config from extensions', () => {
    const loaded: LoadedExtension[] = [
      {
        source: makeSource('test'),
        extension: {
          id: 'test',
          branding: { name: 'Custom App', documentTitle: 'Custom' },
        },
      },
    ];

    const config = resolveShellRuntimeConfig(loaded);
    expect(config.branding.name).toBe('Custom App');
    expect(config.branding.documentTitle).toBe('Custom');
  });

  it('keeps backend menus unchanged instead of merging extension menus', () => {
    setLoadedExtensions([
      {
        source: makeSource('test'),
        extension: {
          id: 'test',
          menus: [makeMenuItem({ id: 'ext-page', path: '/ext', title: 'Ext' })],
        },
      },
    ]);

    const result = mergeExtensionMenus({ home: '/', items: [makeMenuItem({ id: 'home', path: '/home', title: 'Home' })] });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('home');
    expect(hasMenuOverride()).toBe(false);
  });

  it('ignores deprecated menu override for backend-owned menus', () => {
    setLoadedExtensions([
      {
        source: makeSource('test'),
        extension: {
          id: 'test',
          overrideMenus: true,
          menus: [makeMenuItem({ id: 'ext-only', path: '/ext', title: 'Ext' })],
        },
      },
    ]);

    const result = mergeExtensionMenus({ home: '/', items: [makeMenuItem({ id: 'home', path: '/home', title: 'Home' })] });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('home');
    expect(hasMenuOverride()).toBe(false);
  });

  it('resolves shell runtime config with legacy app fields', () => {
    const loaded: LoadedExtension[] = [
      {
        source: makeSource('legacy'),
        extension: {
          id: 'legacy',
          app: { name: 'Legacy App', shortName: 'Legacy', logoUrl: '/logo.png', defaultHomePath: '/legacy-home' },
        },
      },
    ];

    const config = resolveShellRuntimeConfig(loaded);
    expect(config.branding.name).toBe('Legacy App');
    expect(config.branding.shortName).toBe('Legacy');
    expect(config.branding.logoUrl).toBe('/logo.png');
    expect(config.branding.documentTitle).toBe('Legacy App');
    expect(config.shell.defaultHomePath).toBe('/legacy-home');
  });

  it('resolves shell runtime config with loginUi override', () => {
    const loaded: LoadedExtension[] = [
      {
        source: makeSource('login'),
        extension: {
          id: 'login',
          loginUi: {
            heroTitleKey: 'custom.hero',
            cardTitleKey: 'custom.card',
            features: [{ titleKey: 'f1', descriptionKey: 'd1' }],
          },
        },
      },
    ];

    const config = resolveShellRuntimeConfig(loaded);
    expect(config.loginUi.heroTitleKey).toBe('custom.hero');
    expect(config.loginUi.cardTitleKey).toBe('custom.card');
    expect(config.loginUi.features).toHaveLength(1);
  });

  it('resolves shell runtime config with shell settings', () => {
    const loaded: LoadedExtension[] = [
      {
        source: makeSource('shell-ext'),
        extension: {
          id: 'shell-ext',
          shell: {
            defaultHomePath: '/dashboard',
            helpUrl: '/help',
            aboutUrl: '/about',
            sidebarWidthRem: 15,
            sidebarCollapsedWidthRem: 4.5,
          },
        },
      },
    ];

    const config = resolveShellRuntimeConfig(loaded);
    expect(config.shell.defaultHomePath).toBe('/dashboard');
    expect(config.shell.helpUrl).toBe('/help');
    expect(config.shell.aboutUrl).toBe('/about');
    expect(config.shell.sidebarWidthRem).toBe(15);
    expect(config.shell.sidebarCollapsedWidthRem).toBe(4.5);
  });

  it('resolves shell runtime config with systemPages', () => {
    const loaded: LoadedExtension[] = [
      {
        source: makeSource('pages'),
        extension: {
          id: 'pages',
          systemPages: { login: 'CustomLogin', forbidden: 'CustomForbidden' },
        },
      },
    ];

    const config = resolveShellRuntimeConfig(loaded);
    expect(config.systemPages.login).toBe('CustomLogin');
    expect(config.systemPages.forbidden).toBe('CustomForbidden');
  });

  it('resolves config sorted by extension order', () => {
    const loaded: LoadedExtension[] = [
      {
        source: makeSource('second'),
        extension: { id: 'second', order: 10, branding: { name: 'Second' } },
      },
      {
        source: makeSource('first'),
        extension: { id: 'first', order: 1, branding: { name: 'First' } },
      },
    ];

    const config = resolveShellRuntimeConfig(loaded);
    expect(config.branding.name).toBe('Second');
  });

  it('setShellRuntimeConfig and getShellRuntimeConfig round-trip', () => {
    const config = {
      branding: { name: 'Test', shortName: 'T', documentTitle: 'Test' },
      loginUi: { features: [{ titleKey: 'a', descriptionKey: 'b' }] },
      shell: { defaultHomePath: '/test' },
      systemPages: { login: 'TestLogin' },
    };

    setShellRuntimeConfig(config as any);
    const result = getShellRuntimeConfig();
    expect(result.branding.name).toBe('Test');
    expect(result.shell.defaultHomePath).toBe('/test');
    expect(result.systemPages.login).toBe('TestLogin');
  });

  it('getExtensionDefaultHomePath returns shell defaultHomePath', () => {
    setShellRuntimeConfig({
      branding: { name: 'T', shortName: 'T', documentTitle: 'T' },
      loginUi: { features: [] },
      shell: { defaultHomePath: '/custom-home' },
      systemPages: {},
    } as any);

    expect(getExtensionDefaultHomePath()).toBe('/custom-home');
  });

  it('getSystemPageComponentId returns page component id', () => {
    setShellRuntimeConfig({
      branding: { name: 'T', shortName: 'T', documentTitle: 'T' },
      loginUi: { features: [] },
      shell: {},
      systemPages: { notFound: 'NotFoundPage', serverError: 'ServerErrorPage' },
    } as any);

    expect(getSystemPageComponentId('notFound')).toBe('NotFoundPage');
    expect(getSystemPageComponentId('serverError')).toBe('ServerErrorPage');
    expect(getSystemPageComponentId('dashboard')).toBeUndefined();
  });

  it('does not append extension menus by default', () => {
    setLoadedExtensions([
      {
        source: makeSource('append'),
        extension: {
          id: 'append',
          menus: [makeMenuItem({ id: 'new', path: '/new', title: 'New' })],
        },
      },
    ]);

    const result = mergeExtensionMenus({
      home: '/orig',
      items: [makeMenuItem({ id: 'orig', path: '/orig', title: 'Orig' })],
    });

    expect(result.items).toHaveLength(1);
    expect(result.home).toBe('/orig');
  });

  it('does not set home from extension menus', () => {
    setLoadedExtensions([
      {
        source: makeSource('append'),
        extension: {
          id: 'append',
          menus: [makeMenuItem({ id: 'new', path: '/new', title: 'New' })],
        },
      },
    ]);

    const result = mergeExtensionMenus({
      home: undefined as any,
      items: [makeMenuItem({ id: 'orig', path: '/orig', title: 'Orig' })],
    });

    expect(result.home).toBeUndefined();
  });

  it('skips extensions with empty menus array', () => {
    setLoadedExtensions([
      {
        source: makeSource('empty'),
        extension: { id: 'empty', menus: [] },
      },
    ]);

    const result = mergeExtensionMenus({
      home: '/',
      items: [makeMenuItem({ id: 'home', path: '/home', title: 'Home' })],
    });

    expect(result.items).toHaveLength(1);
  });

  it('does not replace backend menus when overrideMenus is set', () => {
    setLoadedExtensions([
      {
        source: makeSource('override'),
        extension: {
          id: 'override',
          overrideMenus: true,
          menus: [
            makeMenuItem({ id: 'ov1', path: '/ov1', title: 'OV1' }),
            makeMenuItem({ id: 'ov2', path: '/ov2', title: 'OV2' }),
          ],
        },
      },
    ]);

    const result = mergeExtensionMenus({
      home: '/old',
      items: [makeMenuItem({ id: 'old', path: '/old', title: 'Old' })],
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('old');
    expect(result.home).toBe('/old');
  });

  it('applies extension user menu delta by id', () => {
    setLoadedExtensions([
      {
        source: makeSource('first'),
        extension: {
          id: 'first',
          userMenuItems: [
            { id: 'theme', title: 'Theme Settings', path: '/settings/theme' },
            { id: 'help', override: 'remove' },
          ],
        },
      },
      {
        source: makeSource('second'),
        extension: {
          id: 'second',
          order: 10,
          userMenuItems: [{ id: 'theme', title: 'Visual Theme', override: 'replace', href: '/docs/theme' }],
        },
      },
    ]);

    const result = resolveExtensionUserMenuItems([
      { id: 'settings', title: 'Settings', path: '/settings' },
      { id: 'help', title: 'Help', path: '/help' },
    ]);

    expect(result.map((item) => item.id)).toEqual(['settings', 'theme']);
    const themeItem = result.find((item) => item.id === 'theme');
    expect(themeItem).toMatchObject({
      title: 'Visual Theme',
      href: '/docs/theme',
    });
    expect(themeItem).not.toHaveProperty('path');
  });

  it('mergeExtensionMenus handles extensions without menus', () => {
    setLoadedExtensions([
      {
        source: makeSource('no-menu'),
        extension: { id: 'no-menu' },
      },
    ]);

    const result = mergeExtensionMenus({
      home: '/',
      items: [makeMenuItem({ id: 'home', path: '/home', title: 'Home' })],
    });

    expect(result.items).toHaveLength(1);
  });

  it('returns default config when no extensions provided', () => {
    const config = resolveShellRuntimeConfig([]);
    expect(config.branding.name).toBe('NOP Chaos Console');
    expect(config.loginUi.features).toHaveLength(3);
  });
});
