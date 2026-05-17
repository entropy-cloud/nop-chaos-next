import { describe, expect, it } from 'vitest';
import type { MenuItem } from '../types/menu';
import {
  filterMenusByRoles,
  flattenMenus,
  findMenuItemByPath,
  collectBreadcrumbTrail,
  matchMenuPath,
  sortMenus,
} from './menu';

const sampleItems: MenuItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    path: '/dashboard',
    pageType: 'builtin',
    componentId: 'dashboard',
  },
  {
    id: 'admin',
    title: 'Admin',
    path: '/admin',
    pageType: 'builtin',
    componentId: 'admin-root',
    roles: ['admin'],
    children: [
      {
        id: 'users',
        title: 'Users',
        path: '/admin/users',
        pageType: 'builtin',
        componentId: 'users',
      },
      {
        id: 'settings',
        title: 'Settings',
        path: '/admin/settings',
        pageType: 'builtin',
        componentId: 'settings',
        sort: 1,
      },
    ],
  },
  {
    id: 'reports',
    title: 'Reports',
    path: '/reports',
    pageType: 'builtin',
    componentId: 'reports',
    children: [
      {
        id: 'daily',
        title: 'Daily',
        path: '/reports/daily',
        pageType: 'builtin',
        componentId: 'daily-report',
      },
      {
        id: 'monthly',
        title: 'Monthly',
        path: '/reports/monthly',
        pageType: 'builtin',
        componentId: 'monthly-report',
      },
    ],
  },
];

describe('matchMenuPath', () => {
  it('returns true for exact match', () => {
    expect(matchMenuPath('/dashboard', '/dashboard')).toBe(true);
  });

  it('returns false for different paths', () => {
    expect(matchMenuPath('/dashboard', '/settings')).toBe(false);
  });

  it('returns true for dynamic segment match', () => {
    expect(matchMenuPath('/users/:id', '/users/42')).toBe(true);
  });

  it('returns false when segment counts differ', () => {
    expect(matchMenuPath('/users/:id', '/users/42/details')).toBe(false);
  });

  it('matches multiple dynamic segments', () => {
    expect(matchMenuPath('/org/:orgId/user/:userId', '/org/5/user/10')).toBe(true);
  });

  it('returns false when static segment does not match', () => {
    expect(matchMenuPath('/users/:id', '/items/42')).toBe(false);
  });

  it('handles trailing slashes', () => {
    expect(matchMenuPath('/dashboard/', '/dashboard')).toBe(true);
  });

  it('handles empty strings', () => {
    expect(matchMenuPath('', '')).toBe(true);
  });
});

describe('flattenMenus', () => {
  it('flattens nested menus into a single list', () => {
    const flat = flattenMenus(sampleItems);
    expect(flat.map((i) => i.id)).toEqual([
      'dashboard',
      'admin',
      'users',
      'settings',
      'reports',
      'daily',
      'monthly',
    ]);
  });

  it('returns same items for flat list without children', () => {
    const items: MenuItem[] = [
      { id: 'a', title: 'A', path: '/a', pageType: 'builtin', componentId: 'a' },
      { id: 'b', title: 'B', path: '/b', pageType: 'builtin', componentId: 'b' },
    ];
    expect(flattenMenus(items).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('returns empty array for empty input', () => {
    expect(flattenMenus([])).toEqual([]);
  });
});

describe('findMenuItemByPath', () => {
  it('finds top-level item by exact path', () => {
    expect(findMenuItemByPath(sampleItems, '/dashboard')?.id).toBe('dashboard');
  });

  it('finds nested item by path', () => {
    expect(findMenuItemByPath(sampleItems, '/admin/users')?.id).toBe('users');
  });

  it('finds deeply nested item', () => {
    expect(findMenuItemByPath(sampleItems, '/reports/daily')?.id).toBe('daily');
  });

  it('returns undefined for non-existent path', () => {
    expect(findMenuItemByPath(sampleItems, '/nonexistent')).toBeUndefined();
  });

  it('returns undefined for empty array', () => {
    expect(findMenuItemByPath([], '/dashboard')).toBeUndefined();
  });

  it('matches dynamic route segments', () => {
    const items: MenuItem[] = [
      {
        id: 'user-detail',
        title: 'User Detail',
        path: '/users/:id',
        pageType: 'builtin',
        componentId: 'user-detail',
      },
    ];
    expect(findMenuItemByPath(items, '/users/123')?.id).toBe('user-detail');
  });
});

describe('collectBreadcrumbTrail', () => {
  it('returns trail for top-level item', () => {
    const trail = collectBreadcrumbTrail(sampleItems, '/dashboard');
    expect(trail.map((i) => i.id)).toEqual(['dashboard']);
  });

  it('returns trail for nested item', () => {
    const trail = collectBreadcrumbTrail(sampleItems, '/admin/users');
    expect(trail.map((i) => i.id)).toEqual(['admin', 'users']);
  });

  it('returns trail for deeply nested item', () => {
    const trail = collectBreadcrumbTrail(sampleItems, '/reports/daily');
    expect(trail.map((i) => i.id)).toEqual(['reports', 'daily']);
  });

  it('returns empty array for non-existent path', () => {
    expect(collectBreadcrumbTrail(sampleItems, '/nonexistent')).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(collectBreadcrumbTrail([], '/dashboard')).toEqual([]);
  });

  it('matches dynamic segment paths', () => {
    const items: MenuItem[] = [
      {
        id: 'users',
        title: 'Users',
        path: '/users',
        pageType: 'builtin',
        componentId: 'users',
        children: [
          {
            id: 'user-detail',
            title: 'User Detail',
            path: '/users/:id',
            pageType: 'builtin',
            componentId: 'user-detail',
          },
        ],
      },
    ];
    const trail = collectBreadcrumbTrail(items, '/users/42');
    expect(trail.map((i) => i.id)).toEqual(['users', 'user-detail']);
  });
});

describe('sortMenus', () => {
  it('sorts items by sort field ascending', () => {
    const items: MenuItem[] = [
      { id: 'c', title: 'C', path: '/c', pageType: 'builtin', componentId: 'c', sort: 3 },
      { id: 'a', title: 'A', path: '/a', pageType: 'builtin', componentId: 'a', sort: 1 },
      { id: 'b', title: 'B', path: '/b', pageType: 'builtin', componentId: 'b', sort: 2 },
    ];
    expect(sortMenus(items).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('treats missing sort as 0', () => {
    const items: MenuItem[] = [
      { id: 'b', title: 'B', path: '/b', pageType: 'builtin', componentId: 'b', sort: 5 },
      { id: 'a', title: 'A', path: '/a', pageType: 'builtin', componentId: 'a' },
    ];
    expect(sortMenus(items).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('sorts children recursively', () => {
    const items: MenuItem[] = [
      {
        id: 'parent',
        title: 'Parent',
        path: '/parent',
        pageType: 'builtin',
        componentId: 'parent',
        children: [
          { id: 'c2', title: 'C2', path: '/parent/c2', pageType: 'builtin', componentId: 'c2', sort: 2 },
          { id: 'c1', title: 'C1', path: '/parent/c1', pageType: 'builtin', componentId: 'c1', sort: 1 },
        ],
      },
    ];
    const sorted = sortMenus(items);
    expect(sorted[0]?.children?.map((i) => i.id)).toEqual(['c1', 'c2']);
  });

  it('does not mutate the original array', () => {
    const items: MenuItem[] = [
      { id: 'b', title: 'B', path: '/b', pageType: 'builtin', componentId: 'b', sort: 2 },
      { id: 'a', title: 'A', path: '/a', pageType: 'builtin', componentId: 'a', sort: 1 },
    ];
    const idsBefore = items.map((i) => i.id);
    sortMenus(items);
    expect(items.map((i) => i.id)).toEqual(idsBefore);
  });

  it('returns empty array for empty input', () => {
    expect(sortMenus([])).toEqual([]);
  });
});

describe('filterMenusByRoles', () => {
  it('keeps parent when a child is visible by role', () => {
    const items: MenuItem[] = [
      {
        id: 'admin-root',
        title: 'Admin Root',
        path: '/admin',
        pageType: 'builtin',
        componentId: 'admin-root',
        roles: ['admin'],
        children: [
          {
            id: 'report-view',
            title: 'Report View',
            path: '/admin/report',
            pageType: 'builtin',
            componentId: 'report-view',
            roles: ['report-viewer'],
          },
        ],
      },
    ];

    const filtered = filterMenusByRoles(items, ['report-viewer']);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('admin-root');
    expect(filtered[0]?.children).toHaveLength(1);
    expect(filtered[0]?.children?.[0]?.id).toBe('report-view');
  });

  it('removes parent when neither parent nor children are allowed', () => {
    const items: MenuItem[] = [
      {
        id: 'admin-root',
        title: 'Admin Root',
        path: '/admin',
        pageType: 'builtin',
        componentId: 'admin-root',
        roles: ['admin'],
        children: [
          {
            id: 'secret',
            title: 'Secret',
            path: '/admin/secret',
            pageType: 'builtin',
            componentId: 'secret',
            roles: ['super-admin'],
          },
        ],
      },
    ];

    const filtered = filterMenusByRoles(items, ['analyst']);

    expect(filtered).toHaveLength(0);
  });

  it('keeps items with no roles unrestricted', () => {
    const items: MenuItem[] = [
      { id: 'public', title: 'Public', path: '/public', pageType: 'builtin', componentId: 'public' },
    ];
    expect(filterMenusByRoles(items, ['any-role'])).toHaveLength(1);
  });

  it('keeps parent allowed by role even when children are all filtered', () => {
    const items: MenuItem[] = [
      {
        id: 'parent',
        title: 'Parent',
        path: '/parent',
        pageType: 'builtin',
        componentId: 'parent',
        roles: ['admin'],
        children: [
          {
            id: 'child',
            title: 'Child',
            path: '/parent/child',
            pageType: 'builtin',
            componentId: 'child',
            roles: ['super-admin'],
          },
        ],
      },
    ];
    const filtered = filterMenusByRoles(items, ['admin']);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.roles).toBeUndefined();
  });

  it('keeps parent with empty roles array as unrestricted', () => {
    const items: MenuItem[] = [
      {
        id: 'parent',
        title: 'Parent',
        path: '/parent',
        pageType: 'builtin',
        componentId: 'parent',
        roles: [],
      },
    ];
    expect(filterMenusByRoles(items, ['any'])).toHaveLength(1);
  });

  it('handles empty menu array', () => {
    expect(filterMenusByRoles([], ['admin'])).toEqual([]);
  });

  it('filters nested children recursively', () => {
    const items: MenuItem[] = [
      {
        id: 'root',
        title: 'Root',
        path: '/root',
        pageType: 'builtin',
        componentId: 'root',
        children: [
          {
            id: 'child-a',
            title: 'Child A',
            path: '/root/a',
            pageType: 'builtin',
            componentId: 'child-a',
            roles: ['role-a'],
          },
          {
            id: 'child-b',
            title: 'Child B',
            path: '/root/b',
            pageType: 'builtin',
            componentId: 'child-b',
            roles: ['role-b'],
          },
        ],
      },
    ];
    const filtered = filterMenusByRoles(items, ['role-b']);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.children).toHaveLength(1);
    expect(filtered[0]?.children?.[0]?.id).toBe('child-b');
  });
});
