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
});
