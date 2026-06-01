import { afterEach, describe, expect, it } from 'vitest';
import { setLoadedExtensions } from '@nop-chaos/extension-host';
import { mergeBuiltinSystemMenus, mergeRouteOnlySystemMenus } from './systemMenus';

describe('mergeBuiltinSystemMenus', () => {
  afterEach(() => {
    setLoadedExtensions([]);
  });

  it('keeps backend menu items unchanged when extensions declare deprecated menu overrides', () => {
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
    expect(result.items.some((item) => item.path === '/settings')).toBe(false);
    expect(result.items.some((item) => item.path === '/help')).toBe(false);
    expect(result.items.some((item) => item.path === '/extensions/dms/issuer')).toBe(true);
  });

  it('uses default home as home when no route exists', () => {
    const result = mergeBuiltinSystemMenus({
      home: '/nonexistent',
      items: [],
    });

    expect(result.home).toBe('/dashboard');
  });

  it('uses extension default home path only when it is backend-provided', () => {
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
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          path: '/dashboard',
          pageType: 'builtin',
          componentId: 'dashboard',
        },
      ],
    });

    expect(result.home).toBe('/dashboard');
  });

  it('prefers menu home when it exists in available paths', () => {
    const result = mergeBuiltinSystemMenus({
      home: '/dashboard',
      items: [
        {
          id: 'dashboard',
          title: 'Dashboard',
          path: '/dashboard',
          pageType: 'builtin',
          componentId: 'dashboard',
        },
      ],
    });

    expect(result.home).toBe('/dashboard');
  });

  it('falls back to first backend item path when menu home is unavailable', () => {
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

  it('does not merge builtin system menus into backend navigation', () => {
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
    expect(result.items.some((item) => item.path === '/settings')).toBe(false);
  });

  it('adds route-only user menu pages for routing without changing backend navigation', () => {
    const result = mergeRouteOnlySystemMenus({
      home: '/orders',
      items: [
        {
          id: 'orders',
          title: 'Orders',
          path: '/orders',
          pageType: 'builtin',
          componentId: 'orders',
        },
      ],
    });

    const settings = result.items.find((item) => item.id === 'settings');
    expect(settings?.path).toBe('/settings');
    expect(settings?.hideInMenu).toBe(true);
    expect(result.items.some((item) => item.id === 'orders')).toBe(true);
  });
});
