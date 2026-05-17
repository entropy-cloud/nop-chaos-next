import { afterEach, describe, expect, it } from 'vitest';
import { setLoadedExtensions } from '@nop-chaos/extension-host';
import { mergeBuiltinSystemMenus } from './systemMenus';

describe('mergeBuiltinSystemMenus', () => {
  afterEach(() => {
    setLoadedExtensions([]);
  });

  it('keeps builtin system pages available when extensions override menus', () => {
    setLoadedExtensions([
      {
        source: {
          id: 'example-dms',
          load: async () => ({ default: { id: 'example-dms' } }),
        },
        extension: {
          id: 'example-dms',
          overrideMenus: true,
          menus: [
            {
              id: 'dms-issuer',
              title: 'Issuer',
              path: '/extensions/dms/issuer',
              icon: 'credit-card',
              pageType: 'builtin',
              componentId: 'dms-issuer-worklist',
            },
          ],
        },
      },
    ]);

    const result = mergeBuiltinSystemMenus({
      home: '/extensions/dms/issuer',
      items: [
        {
          id: 'dms-issuer',
          title: 'Issuer',
          path: '/extensions/dms/issuer',
          icon: 'credit-card',
          pageType: 'builtin',
          componentId: 'dms-issuer-worklist',
        },
      ],
    });

    expect(result.home).toBe('/extensions/dms/issuer');
    expect(result.items.some((item) => item.path === '/settings')).toBe(true);
    expect(result.items.some((item) => item.path === '/help')).toBe(true);
    expect(result.items.some((item) => item.path === '/extensions/dms/issuer')).toBe(true);
    expect(result.items.find((item) => item.path === '/settings')?.hideInMenu).toBe(true);
    expect(result.items.find((item) => item.path === '/help')?.hideInMenu).toBe(true);
  });

  it('uses /dashboard as home when no extension home and menu home not in paths', () => {
    const result = mergeBuiltinSystemMenus({
      home: '/nonexistent',
      items: [],
    });

    expect(result.home).toBe('/dashboard');
  });

  it('uses extension default home path when available', () => {
    setLoadedExtensions([
      {
        source: {
          id: 'test-ext',
          load: async () => ({ default: { id: 'test-ext' } }),
        },
        extension: {
          id: 'test-ext',
          menus: [],
          shell: {
            defaultHomePath: '/dashboard',
          },
        },
      },
    ]);

    const result = mergeBuiltinSystemMenus({
      home: '/nonexistent',
      items: [],
    });

    expect(result.home).toBe('/dashboard');
  });

  it('prefers menu home when it exists in available paths', () => {
    const result = mergeBuiltinSystemMenus({
      home: '/dashboard',
      items: [],
    });

    expect(result.home).toBe('/dashboard');
  });

  it('falls back to first item path when menu home not available with override', () => {
    setLoadedExtensions([
      {
        source: {
          id: 'override-ext',
          load: async () => ({ default: { id: 'override-ext' } }),
        },
        extension: {
          id: 'override-ext',
          overrideMenus: true,
          menus: [
            {
              id: 'ext-1',
              title: 'Ext',
              path: '/ext/page',
              icon: 'box',
              pageType: 'builtin',
              componentId: 'ext-page',
            },
          ],
        },
      },
    ]);

    const result = mergeBuiltinSystemMenus({
      home: '/nonexistent',
      items: [
        {
          id: 'ext-1',
          title: 'Ext',
          path: '/ext/page',
          icon: 'box',
          pageType: 'builtin',
          componentId: 'ext-page',
        },
      ],
    });

    expect(result.home).toBe('/ext/page');
  });

  it('merges existing items with builtin system menus', () => {
    const result = mergeBuiltinSystemMenus({
      home: '/',
      items: [
        {
          id: 'dashboard',
          titleKey: 'Custom Dashboard',
          path: '/dashboard',
          icon: 'custom',
          pageType: 'builtin',
          componentId: 'dashboard',
        },
      ],
    });

    const dashboard = result.items.find((item) => item.id === 'dashboard');
    expect(dashboard?.titleKey).toBe('Custom Dashboard');
    expect(result.items.some((item) => item.path === '/settings')).toBe(true);
  });
});
