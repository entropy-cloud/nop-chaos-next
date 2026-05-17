import { describe, expect, it } from 'vitest';
import { validateMenuResponse } from './menuConfig';

describe('validateMenuResponse', () => {
  it('accepts arbitrary icon strings for menu items', () => {
    const result = validateMenuResponse({
      home: '/extensions/dms/issuer',
      items: [
        {
          id: 'dms-issuer',
          title: 'Issuer',
          path: '/extensions/dms/issuer',
          icon: 'credit-card',
          pageType: 'builtin',
          componentId: 'dms-issuer-worklist',
          children: [
            {
              id: 'dms-issuer-workbench',
              title: 'Workbench',
              path: '/extensions/dms/issuer/workbench',
              icon: 'fa-credit-card',
              pageType: 'builtin',
              componentId: 'dms-issuer-workbench',
            },
          ],
        },
      ],
    });

    expect(result.items[0]?.icon).toBe('credit-card');
    expect(result.items[0]?.children?.[0]?.icon).toBe('fa-credit-card');
  });

  it('accepts flux menu items with schema paths', () => {
    const result = validateMenuResponse({
      home: '/flux-demo',
      items: [
        {
          id: 'flux-demo',
          title: 'Flux Demo',
          path: '/flux-demo',
          pageType: 'flux',
          schemaPath: 'mock://flux-demo',
        },
      ],
    });

    expect(result.items[0]).toMatchObject({
      id: 'flux-demo',
      pageType: 'flux',
      schemaPath: 'mock://flux-demo',
    });
  });

  it('throws when root value is not an object', () => {
    expect(() => validateMenuResponse(null)).toThrow('root value must be an object');
    expect(() => validateMenuResponse('string')).toThrow('root value must be an object');
    expect(() => validateMenuResponse(42)).toThrow('root value must be an object');
  });

  it('throws when root value is an array', () => {
    expect(() => validateMenuResponse([])).toThrow('root value must be an object');
  });

  it('throws when items is not an array', () => {
    expect(() =>
      validateMenuResponse({ items: 'not-array' }),
    ).toThrow("'items' must be an array");
  });

  it('throws when menu item is not an object', () => {
    expect(() =>
      validateMenuResponse({ items: ['not-object'] }),
    ).toThrow("'items[0]' must be an object");
  });

  it('throws when id is missing', () => {
    expect(() =>
      validateMenuResponse({ items: [{ path: '/a', title: 'A', pageType: 'builtin' }] }),
    ).toThrow("'items[0].id' must be a non-empty string");
  });

  it('throws when id is empty string', () => {
    expect(() =>
      validateMenuResponse({
        items: [{ id: '', path: '/a', title: 'A', pageType: 'builtin' }],
      }),
    ).toThrow("'items[0].id' must be a non-empty string");
  });

  it('throws when path is missing', () => {
    expect(() =>
      validateMenuResponse({
        items: [{ id: 'a', title: 'A', pageType: 'builtin' }],
      }),
    ).toThrow("'items[0].path' must be a non-empty string");
  });

  it('throws when pageType is invalid', () => {
    expect(() =>
      validateMenuResponse({
        items: [{ id: 'a', title: 'A', path: '/a', pageType: 'invalid' }],
      }),
    ).toThrow("'items[0].pageType' must be 'builtin'");
  });

  it('throws when neither title nor titleKey is provided', () => {
    expect(() =>
      validateMenuResponse({
        items: [{ id: 'a', path: '/a', pageType: 'builtin', componentId: 'a' }],
      }),
    ).toThrow("must define 'title' or 'titleKey'");
  });

  it('accepts titleKey instead of title', () => {
    const result = validateMenuResponse({
      items: [
        { id: 'a', titleKey: 'menu.a', path: '/a', pageType: 'builtin', componentId: 'a' },
      ],
    });
    expect(result.items[0]?.titleKey).toBe('menu.a');
    expect(result.items[0]?.title).toBeUndefined();
  });

  it('throws when pageType is plugin without pluginUrl', () => {
    expect(() =>
      validateMenuResponse({
        items: [{ id: 'a', title: 'A', path: '/a', pageType: 'plugin' }],
      }),
    ).toThrow("'items[0].pluginUrl' is required for plugin pages");
  });

  it('accepts plugin page with pluginUrl', () => {
    const result = validateMenuResponse({
      items: [
        {
          id: 'a',
          title: 'A',
          path: '/a',
          pageType: 'plugin',
          pluginUrl: 'http://cdn/plugin.js',
        },
      ],
    });
    expect(result.items[0]?.pageType).toBe('plugin');
  });

  it('throws when pageType is builtin without componentId', () => {
    expect(() =>
      validateMenuResponse({
        items: [{ id: 'a', title: 'A', path: '/a', pageType: 'builtin' }],
      }),
    ).toThrow("'items[0].componentId' is required for builtin pages");
  });

  it('throws when pageType is amis without schemaPath', () => {
    expect(() =>
      validateMenuResponse({
        items: [{ id: 'a', title: 'A', path: '/a', pageType: 'amis' }],
      }),
    ).toThrow("'items[0].schemaPath' is required for amis pages");
  });

  it('accepts amis page with schemaPath', () => {
    const result = validateMenuResponse({
      items: [
        { id: 'a', title: 'A', path: '/a', pageType: 'amis', schemaPath: 'mock://a' },
      ],
    });
    expect(result.items[0]?.pageType).toBe('amis');
  });

  it('throws when pageType is iframe without frameSrc', () => {
    expect(() =>
      validateMenuResponse({
        items: [{ id: 'a', title: 'A', path: '/a', pageType: 'iframe' }],
      }),
    ).toThrow("'items[0].frameSrc' is required for iframe pages");
  });

  it('accepts iframe page with frameSrc', () => {
    const result = validateMenuResponse({
      items: [
        { id: 'a', title: 'A', path: '/a', pageType: 'iframe', frameSrc: 'https://example.com' },
      ],
    });
    expect(result.items[0]?.pageType).toBe('iframe');
  });

  it('throws when pageType is external without externalUrl', () => {
    expect(() =>
      validateMenuResponse({
        items: [{ id: 'a', title: 'A', path: '/a', pageType: 'external' }],
      }),
    ).toThrow("'items[0].externalUrl' is required for external pages");
  });

  it('accepts external page with externalUrl', () => {
    const result = validateMenuResponse({
      items: [
        { id: 'a', title: 'A', path: '/a', pageType: 'external', externalUrl: 'https://example.com' },
      ],
    });
    expect(result.items[0]?.pageType).toBe('external');
  });

  it('throws when sort is NaN', () => {
    expect(() =>
      validateMenuResponse({
        items: [
          { id: 'a', title: 'A', path: '/a', pageType: 'builtin', componentId: 'a', sort: NaN },
        ],
      }),
    ).toThrow("'items[0].sort' must be a number");
  });

  it('throws when hideInMenu is not a boolean', () => {
    expect(() =>
      validateMenuResponse({
        items: [
          { id: 'a', title: 'A', path: '/a', pageType: 'builtin', componentId: 'a', hideInMenu: 'yes' },
        ],
      }),
    ).toThrow("'items[0].hideInMenu' must be a boolean");
  });

  it('throws when roles is not an array of strings', () => {
    expect(() =>
      validateMenuResponse({
        items: [
          { id: 'a', title: 'A', path: '/a', pageType: 'builtin', componentId: 'a', roles: [1, 2] },
        ],
      }),
    ).toThrow("'items[0].roles' must be an array of strings");
  });

  it('throws when title is not a string', () => {
    expect(() =>
      validateMenuResponse({
        items: [{ id: 'a', title: 123, path: '/a', pageType: 'builtin', componentId: 'a' }],
      }),
    ).toThrow("'items[0].title' must be a string");
  });

  it('throws when id is not a string', () => {
    expect(() =>
      validateMenuResponse({
        items: [{ id: 123, title: 'A', path: '/a', pageType: 'builtin', componentId: 'a' }],
      }),
    ).toThrow("'items[0].id' must be a non-empty string");
  });

  it('accepts optional fields as undefined', () => {
    const result = validateMenuResponse({
      items: [
        {
          id: 'a',
          title: 'A',
          path: '/a',
          pageType: 'builtin',
          componentId: 'a',
        },
      ],
    });
    expect(result.items[0]).toMatchObject({
      icon: undefined,
      badge: undefined,
      sort: undefined,
      hideInMenu: undefined,
      roles: undefined,
      children: undefined,
    });
  });

  it('validates nested children', () => {
    expect(() =>
      validateMenuResponse({
        items: [
          {
            id: 'parent',
            title: 'Parent',
            path: '/parent',
            pageType: 'builtin',
            componentId: 'parent',
            children: ['invalid'],
          },
        ],
      }),
    ).toThrow("'items[0].children[0]' must be an object");
  });

  it('throws when children is not an array', () => {
    expect(() =>
      validateMenuResponse({
        items: [
          {
            id: 'parent',
            title: 'Parent',
            path: '/parent',
            pageType: 'builtin',
            componentId: 'parent',
            children: 'not-array',
          },
        ],
      }),
    ).toThrow("'items[0].children' must be an array");
  });

  it('returns home as undefined when not provided', () => {
    const result = validateMenuResponse({
      items: [
        { id: 'a', title: 'A', path: '/a', pageType: 'builtin', componentId: 'a' },
      ],
    });
    expect(result.home).toBeUndefined();
  });

  it('throws when home is not a string', () => {
    expect(() =>
      validateMenuResponse({
        home: 123,
        items: [{ id: 'a', title: 'A', path: '/a', pageType: 'builtin', componentId: 'a' }],
      }),
    ).toThrow("'home' must be a string");
  });

  it('accepts valid badge string', () => {
    const result = validateMenuResponse({
      items: [
        { id: 'a', title: 'A', path: '/a', pageType: 'builtin', componentId: 'a', badge: 'new' },
      ],
    });
    expect(result.items[0]?.badge).toBe('new');
  });

  it('accepts valid roles array', () => {
    const result = validateMenuResponse({
      items: [
        { id: 'a', title: 'A', path: '/a', pageType: 'builtin', componentId: 'a', roles: ['admin'] },
      ],
    });
    expect(result.items[0]?.roles).toEqual(['admin']);
  });

  it('accepts valid sort number', () => {
    const result = validateMenuResponse({
      items: [
        { id: 'a', title: 'A', path: '/a', pageType: 'builtin', componentId: 'a', sort: 5 },
      ],
    });
    expect(result.items[0]?.sort).toBe(5);
  });

  it('accepts valid hideInMenu boolean', () => {
    const result = validateMenuResponse({
      items: [
        { id: 'a', title: 'A', path: '/a', pageType: 'builtin', componentId: 'a', hideInMenu: true },
      ],
    });
    expect(result.items[0]?.hideInMenu).toBe(true);
  });
});
