import { describe, expect, it } from 'vitest';
import { mapLegacySiteMapToMenuResponse } from './menuMapper';

describe('mapLegacySiteMapToMenuResponse', () => {
  it('maps legacy flux menu resources to flux routes', () => {
    const result = mapLegacySiteMapToMenuResponse({
      children: [
        {
          id: 'flux-demo',
          displayName: 'Flux Demo',
          routePath: '/flux-demo',
          component: 'flux-demo',
          meta: {
            pageType: 'flux',
            schemaPath: 'mock://flux-demo',
            sort: 7,
          },
        },
      ],
    });

    expect(result.home).toBe('/flux-demo');
    expect(result.items[0]).toMatchObject({
      id: 'flux-demo',
      title: 'Flux Demo',
      path: '/flux-demo',
      pageType: 'flux',
      schemaPath: 'mock://flux-demo',
      sort: 7,
    });
  });
});
