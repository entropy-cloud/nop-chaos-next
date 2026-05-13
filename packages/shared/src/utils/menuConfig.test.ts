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
});
