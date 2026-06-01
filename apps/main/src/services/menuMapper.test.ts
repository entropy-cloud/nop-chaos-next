import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LegacySiteMapResponse } from './menuMapper';

vi.mock('@nop-chaos/shared', () => ({
  validateMenuResponse: (v: unknown) => v,
}));

describe('mapLegacySiteMapToMenuResponse', () => {
  let mapLegacySiteMapToMenuResponse: typeof import('./menuMapper').mapLegacySiteMapToMenuResponse;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('./menuMapper');
    mapLegacySiteMapToMenuResponse = mod.mapLegacySiteMapToMenuResponse;
  });

  it('returns empty items when payload has no resources', () => {
    const result = mapLegacySiteMapToMenuResponse({});
    expect(result.items).toEqual([]);
    expect(result.home).toBe('/');
  });

  it('reads resources from payload.resources', () => {
    const payload: LegacySiteMapResponse = {
      resources: [{ id: 'a', displayName: 'A' }],
    };
    const result = mapLegacySiteMapToMenuResponse(payload);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('a');
  });

  it('reads resources from payload.children when resources is absent', () => {
    const payload: LegacySiteMapResponse = {
      children: [{ id: 'b', displayName: 'B' }],
    };
    const result = mapLegacySiteMapToMenuResponse(payload);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe('b');
  });

  it('prefers payload.resources over payload.children', () => {
    const payload: LegacySiteMapResponse = {
      resources: [{ id: 'from-resources' }],
      children: [{ id: 'from-children' }],
    };
    const result = mapLegacySiteMapToMenuResponse(payload);
    expect(result.items[0].id).toBe('from-resources');
  });

  describe('toPageType branches', () => {
    it('returns plugin when component is "plugin" and url is set', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'p1', component: 'plugin', url: 'http://example.com/plugin.js' }],
      });
      expect(result.items[0].pageType).toBe('plugin');
      expect(result.items[0].pluginUrl).toBe('http://example.com/plugin.js');
    });

    it('returns builtin when component is "plugin" but no url', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'p2', component: 'plugin' }],
      });
      expect(result.items[0].pageType).toBe('builtin');
    });

    it('returns flux when meta.pageType is "flux"', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'f1', meta: { pageType: 'flux', schemaPath: '/schema.json' } }],
      });
      expect(result.items[0].pageType).toBe('flux');
      expect(result.items[0].schemaPath).toBe('/schema.json');
    });

    it('returns flux and uses url as schemaPath when meta.schemaPath is absent', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'f2', url: '/my-flux', meta: { pageType: 'flux' } }],
      });
      expect(result.items[0].pageType).toBe('flux');
      expect(result.items[0].schemaPath).toBe('/my-flux');
    });

    it('returns amis when component is "AMIS"', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'a1', component: 'AMIS', url: '/amis-page.json' }],
      });
      expect(result.items[0].pageType).toBe('amis');
      expect(result.items[0].schemaPath).toBe('/amis-page.json');
    });

    it('returns iframe when component is "IFRAME"', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'i1', component: 'IFRAME', url: 'http://other.com' }],
      });
      expect(result.items[0].pageType).toBe('iframe');
      expect(result.items[0].frameSrc).toBe('http://other.com');
    });

    it('returns external when component is "IFRAME" and target is "external"', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'e1', component: 'IFRAME', url: 'http://other.com', target: 'external' }],
      });
      expect(result.items[0].pageType).toBe('external');
      expect(result.items[0].externalUrl).toBe('http://other.com');
    });

    it('returns builtin by default', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'b1', component: 'SomeOther' }],
      });
      expect(result.items[0].pageType).toBe('builtin');
    });
  });

  describe('toMenuPath', () => {
    it('uses routePath when present', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', routePath: 'foo/bar' }],
      });
      expect(result.items[0].path).toBe('/foo/bar');
    });

    it('prepends slash to routePath missing it', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', routePath: 'foo' }],
      });
      expect(result.items[0].path).toBe('/foo');
    });

    it('preserves leading slash in routePath', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', routePath: '/already/slash' }],
      });
      expect(result.items[0].path).toBe('/already/slash');
    });

    it('falls back to /id when no routePath', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'myid' }],
      });
      expect(result.items[0].path).toBe('/myid');
    });
  });

  describe('extractRoles', () => {
    it('extracts from resource.roles', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'r1', roles: ['admin', 'user'] }],
      });
      expect(result.items[0].roles).toEqual(['admin', 'user']);
    });

    it('extracts from resource.permissions', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'r2', permissions: ['read', 'write'] }],
      });
      expect(result.items[0].roles).toEqual(['read', 'write']);
    });

    it('extracts from resource.permissionList', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'r3', permissionList: ['perm-a'] }],
      });
      expect(result.items[0].roles).toEqual(['perm-a']);
    });

    it('extracts from meta.roles array', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'r4', meta: { roles: ['meta-role'] } }],
      });
      expect(result.items[0].roles).toEqual(['meta-role']);
    });

    it('extracts from meta.roles comma-separated string', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'r5', meta: { roles: 'role-a, role-b,,role-c' } }],
      });
      expect(result.items[0].roles).toEqual(['role-a', 'role-b', 'role-c']);
    });

    it('returns undefined when no roles found', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'r6' }],
      });
      expect(result.items[0].roles).toBeUndefined();
    });

    it('returns undefined when roles is not a string array', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'r7', roles: [1, 2] as unknown as string[] }],
      });
      expect(result.items[0].roles).toBeUndefined();
    });
  });

  describe('toBuiltinComponentId', () => {
    it('maps known component keys', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', component: 'dashboard/analysis' }],
      });
      expect(result.items[0].componentId).toBe('dashboard');
    });

    it('maps component key with leading slash and /index suffix', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', component: '/dashboard/index' }],
      });
      expect(result.items[0].componentId).toBe('dashboard');
    });

    it('maps component key with .vue extension', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', component: 'ai/workbench.vue' }],
      });
      expect(result.items[0].componentId).toBe('ai-workbench');
    });

    it('maps component key with .tsx extension', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', component: 'flow/editor.tsx' }],
      });
      expect(result.items[0].componentId).toBe('flow-editor');
    });

    it('maps known path when component is unknown', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', routePath: '/flow/editor/:id' }],
      });
      expect(result.items[0].componentId).toBe('flow-editor-edit');
    });

    it('slugifies unknown path by replacing slashes with dashes', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', routePath: '/some/unknown/path' }],
      });
      expect(result.items[0].componentId).toBe('some-unknown-path');
    });

    it('returns dashboard for /dashboard path', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', routePath: '/dashboard', component: 'something-unknown' }],
      });
      expect(result.items[0].componentId).toBe('dashboard');
    });

    it('plugin pageType uses resource.id as componentId', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'my-plugin', component: 'plugin', url: 'http://cdn/plugin.js' }],
      });
      expect(result.items[0].componentId).toBe('my-plugin');
    });

    it('non-builtin non-plugin pageType has no componentId', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'a1', component: 'AMIS', url: '/schema.json' }],
      });
      expect(result.items[0].componentId).toBeUndefined();
    });
  });

  describe('findLeafHomePath', () => {
    it('returns first non-hidden item path', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [
          { id: 'home', displayName: 'Home' },
          { id: 'other', displayName: 'Other' },
        ],
      });
      expect(result.home).toBe('/home');
    });

    it('skips hidden items at top level', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [
          { id: 'hidden', displayName: 'Hidden', hidden: true },
          { id: 'visible', displayName: 'Visible' },
        ],
      });
      expect(result.home).toBe('/visible');
    });

    it('recurses into children to find first leaf', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [
          {
            id: 'parent',
            displayName: 'Parent',
            children: [
              { id: 'child1', displayName: 'Child 1' },
              { id: 'child2', displayName: 'Child 2' },
            ],
          },
        ],
      });
      expect(result.home).toBe('/child1');
    });

    it('skips hidden children and recurses deeper', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [
          {
            id: 'parent',
            displayName: 'Parent',
            children: [
              { id: 'hidden-child', displayName: 'Hidden', hidden: true },
              { id: 'visible-child', displayName: 'Visible' },
            ],
          },
        ],
      });
      expect(result.home).toBe('/visible-child');
    });

    it('returns / when all items are hidden and no path found', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'h', displayName: 'H', hidden: true }],
      });
      expect(result.home).toBe('/');
    });
  });

  describe('misc field mapping', () => {
    it('maps icon', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', icon: 'home' }],
      });
      expect(result.items[0].icon).toBe('home');
    });

    it('maps hidden to hideInMenu', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', hidden: true }],
      });
      expect(result.items[0].hideInMenu).toBe(true);
    });

    it('maps meta.sort', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', meta: { sort: 5 } }],
      });
      expect(result.items[0].sort).toBe(5);
    });

    it('maps displayName to title', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', displayName: 'My Page' }],
      });
      expect(result.items[0].title).toBe('My Page');
    });

    it('maps children recursively', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [
          {
            id: 'parent',
            children: [
              {
                id: 'child',
                component: 'plugin',
                url: 'http://cdn/c.js',
                children: [{ id: 'grandchild', displayName: 'GC' }],
              },
            ],
          },
        ],
      });
      expect(result.items[0].children![0].pageType).toBe('plugin');
      expect(result.items[0].children![0].children!).toHaveLength(1);
      expect(result.items[0].children![0].children![0].title).toBe('GC');
    });

    it('sort is undefined when meta.sort is not a number', () => {
      const result = mapLegacySiteMapToMenuResponse({
        resources: [{ id: 'x', meta: { sort: 'not-a-number' } }],
      });
      expect(result.items[0].sort).toBeUndefined();
    });
  });
});
