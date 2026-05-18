// @vitest-environment happy-dom
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Outlet } from 'react-router-dom';
import type { MenuResponse } from '@nop-chaos/shared';

import { AppRoutes } from './AppRoutes';

const menuResponse: MenuResponse = {
  home: '/dashboard',
  items: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      path: '/dashboard',
      icon: 'layout-dashboard',
      pageType: 'builtin',
      componentId: 'dashboard',
    },
    {
      id: 'plugins',
      title: 'Plugins',
      path: '/plugins',
      icon: 'puzzle',
      pageType: 'builtin',
      componentId: 'plugins-overview',
      children: [
        {
          id: 'plugins-management',
          title: 'Plugin Management',
          path: '/plugins/management',
          icon: 'plug-zap',
          pageType: 'builtin',
          componentId: 'plugins-management',
          roles: ['admin'],
        },
      ],
    },
  ],
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { roles: ['viewer'] },
    bootstrapStatus: 'ready',
  }),
}));

vi.mock('../hooks/useMenuConfig', () => ({
  useMenuConfigQuery: () => ({
    data: menuResponse,
    isSuccess: true,
    isError: false,
  }),
}));

vi.mock('./AppShell', () => ({
  AppShell: () => (
    <>
      <div>Shell</div>
      <Outlet />
    </>
  ),
}));

vi.mock('./RouteRenderer', () => ({
  RouteRenderer: ({ item }: { item: { title?: string; path: string; roles?: string[] } }) =>
    item.roles?.length ? <div>Forbidden route: {item.path}</div> : <div>Allowed route: {item.path}</div>,
}));

vi.mock('./pageRegistry', () => ({
  ForbiddenPage: () => <div>Forbidden page</div>,
  LoginPage: () => <div>Login page</div>,
  NotFoundPage: () => <div>Not found page</div>,
  ServerErrorPage: () => <div>Server error page</div>,
  getSystemPage: () => undefined,
}));

describe('AppRoutes permission layering', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    document.body.removeChild(container);
  });

  it('keeps restricted routes registered so direct URLs can render the route-level guard', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/plugins/management']}>
            <AppRoutes />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain('Shell');
    expect(container.textContent).toContain('Forbidden route: /plugins/management');
    expect(container.textContent).not.toContain('Not found page');
  });
});
