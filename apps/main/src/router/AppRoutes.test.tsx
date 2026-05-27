// @vitest-environment happy-dom
import { act } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Outlet } from 'react-router-dom';
import type { MenuResponse } from '@nop-chaos/shared';

import { AppRoutes } from './AppRoutes';
import * as homePath from '../config/homePath';

const { activeMenuState } = vi.hoisted(() => ({
  activeMenuState: {
    value: null as MenuResponse | null,
  },
}));

const mockGetSystemPage = vi.fn();
const authState = {
  isAuthenticated: true,
  user: { roles: ['viewer'] },
  bootstrapStatus: 'ready',
};

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

const duplicatePathMenuResponse: MenuResponse = {
  home: '/flow-editor',
  items: [
    {
      id: 'flow-editor',
      title: 'Flow Editor',
      path: '/flow-editor',
      icon: 'git-branch',
      pageType: 'builtin',
      componentId: 'flow-editor',
      children: [
        {
          id: 'flow-editor-list',
          title: 'Flow Library',
          path: '/flow-editor',
          icon: 'list',
          pageType: 'builtin',
          componentId: 'flow-editor',
        },
        {
          id: 'flow-editor-edit',
          title: 'Flow Editor Edit',
          path: '/flow-editor/:id',
          icon: 'edit',
          pageType: 'builtin',
          componentId: 'flow-editor-edit',
        },
      ],
    },
  ],
};

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('../hooks/useMenuConfig', () => ({
  useMenuConfigQuery: () => ({
    data: activeMenuState.value,
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
  getSystemPage: (...args: unknown[]) => mockGetSystemPage(...args),
}));

describe('AppRoutes permission layering', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    mockGetSystemPage.mockReset();
    authState.isAuthenticated = true;
    authState.user = { roles: ['viewer'] };
    authState.bootstrapStatus = 'ready';
    activeMenuState.value = menuResponse;
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

  it('uses the canonical home path for authenticated redirects after menu resolution', async () => {
    const previousHome = menuResponse.home;
    menuResponse.home = '/plugins/management';
    try {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

      await act(async () => {
        root.render(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/auth/login']}>
              <AppRoutes />
            </MemoryRouter>
          </QueryClientProvider>,
        );
      });

      expect(container.textContent).toContain('Shell');
      expect(container.textContent).toContain('Allowed route: /dashboard');
      expect(homePath.getCurrentHomePath()).toBe('/dashboard');
    } finally {
      menuResponse.home = previousHome;
    }
  });

  it('uses system page overrides for login and not-found routes', async () => {
    mockGetSystemPage.mockImplementation((key: string) => {
      if (key === 'login') {
        return () => <div>Custom login page</div>;
      }

      if (key === 'notFound') {
        return () => <div>Custom not-found page</div>;
      }

      return undefined;
    });

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/missing']}> 
            <AppRoutes />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain('Custom not-found page');

    authState.isAuthenticated = false;

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/auth/login']}>
            <AppRoutes />
          </MemoryRouter>
        </QueryClientProvider>,
      );
    });

    expect(container.textContent).toContain('Custom login page');
    expect(mockGetSystemPage).toHaveBeenCalledWith('login');
  });

  it('prefers leaf routes when parent and child share the same path', async () => {
    activeMenuState.value = duplicatePathMenuResponse;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    try {
      await act(async () => {
        root.render(
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/flow-editor']}>
              <AppRoutes />
            </MemoryRouter>
          </QueryClientProvider>,
        );
      });

      expect(container.textContent).toContain('Allowed route: /flow-editor');
      expect(warnSpy).toHaveBeenCalledWith(
        '[dedupeRoutesByPath] Duplicate route path "flow-editor" - keeping more specific route "flow-editor-list", discarding route "flow-editor"',
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});
