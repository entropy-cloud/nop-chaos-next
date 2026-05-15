import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { LoadedExtension, ExtensionSource, MenuItem } from '@nop-chaos/shared';
import { loadExtensions } from './loadExtensions';
import {
  resolveShellRuntimeConfig,
  setLoadedExtensions,
  getLoadedExtensions,
  mergeExtensionMenus,
  hasMenuOverride
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

  it('merges extension menus without override', () => {
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
    expect(result.items).toHaveLength(2);
    expect(hasMenuOverride()).toBe(false);
  });

  it('handles menu override', () => {
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
    expect(result.items[0].id).toBe('ext-only');
    expect(hasMenuOverride()).toBe(true);
  });
});
