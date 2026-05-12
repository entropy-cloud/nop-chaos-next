import { describe, expect, it } from 'vitest';
import type { MenuItem } from '../types/menu';
import { filterMenusByRoles } from './menu';

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
});
