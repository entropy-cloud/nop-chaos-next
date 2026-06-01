import { Suspense, createElement, lazy, useEffect, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { filterMenusByRoles, flattenMenus, sortMenus } from '@nop-chaos/shared';
import { mergeRouteOnlySystemMenus } from '../config/systemMenus';
import { getCurrentHomePath, setCurrentHomePath } from '../config/homePath';
import { useAuth } from '../hooks/useAuth';
import { useMenuConfigQuery } from '../hooks/useMenuConfig';
import { RouteRenderer } from './RouteRenderer';
import { ForbiddenPage, LoginPage, NotFoundPage, ServerErrorPage, getSystemPage } from './pageRegistry';

const AppShell = lazy(() => import('./AppShell').then((module) => ({ default: module.AppShell })));

const systemPageRoutes = [
  { path: '403', key: 'forbidden' as const, fallback: ForbiddenPage },
  { path: '404', key: 'notFound' as const, fallback: NotFoundPage },
  { path: '500', key: 'serverError' as const, fallback: ServerErrorPage },
];

function renderSystemPage(
  key: 'login' | 'forbidden' | 'notFound' | 'serverError',
  fallback: typeof LoginPage | typeof ForbiddenPage | typeof NotFoundPage | typeof ServerErrorPage,
) {
  return createElement(getSystemPage(key) ?? fallback);
}

function normalizePath(path: string): string {
  return path.replace(/^\//, '');
}

function getRouteSpecificity(item: ReturnType<typeof flattenMenus>[number]) {
  return {
    segmentCount: normalizePath(item.path).split('/').filter(Boolean).length,
    isLeaf: item.children?.length ? 0 : 1,
  };
}

function dedupeRoutesByPath(items: ReturnType<typeof flattenMenus>) {
  const routeByPath = new Map<string, ReturnType<typeof flattenMenus>[number]>();

  for (const item of items) {
    const normalized = normalizePath(item.path);
    const existing = routeByPath.get(normalized);

    if (!existing) {
      routeByPath.set(normalized, item);
      continue;
    }

    const currentSpecificity = getRouteSpecificity(item);
    const existingSpecificity = getRouteSpecificity(existing);
    const shouldReplaceExisting =
      currentSpecificity.isLeaf > existingSpecificity.isLeaf ||
      (currentSpecificity.isLeaf === existingSpecificity.isLeaf &&
        currentSpecificity.segmentCount >= existingSpecificity.segmentCount);

    if (shouldReplaceExisting) {
      console.warn(
        `[dedupeRoutesByPath] Duplicate route path "${normalized}" - keeping more specific route "${item.id}", discarding route "${existing.id}"`,
      );
      routeByPath.set(normalized, item);
      continue;
    }

    console.warn(
      `[dedupeRoutesByPath] Duplicate route path "${normalized}" - keeping more specific route "${existing.id}", discarding route "${item.id}"`,
    );
  }

  return items.filter((item) => routeByPath.get(normalizePath(item.path))?.id === item.id);
}

function resolveAccessibleHomePath(home: string | undefined, routeItems: ReturnType<typeof flattenMenus>) {
  const accessiblePaths = new Set(routeItems.map((item) => item.path));

  if (home && accessiblePaths.has(home)) {
    return home;
  }

  return routeItems[0]?.path ?? '/';
}

// Two-layer permission model (intentional design):
// 1. Menu filtering: `filterMenusByRoles` removes menu items the user cannot see.
// 2. Route render guard: `RouteRenderer` checks `usePermissionGuard` before rendering
//    page content and shows `ForbiddenPage` when access is denied.
// Both layers operate independently so that direct URL access is still guarded even
// when a route is not present in the filtered menu.
export function AppRoutes() {
  const { isAuthenticated, bootstrapStatus, user } = useAuth();
  const bootstrapPending = bootstrapStatus === 'idle' || bootstrapStatus === 'pending';
  const menuQuery = useMenuConfigQuery(isAuthenticated && !bootstrapPending);
  const accessibleRouteItems = useMemo(
    () =>
      dedupeRoutesByPath(
        flattenMenus(
          filterMenusByRoles(
            sortMenus(mergeRouteOnlySystemMenus(menuQuery.data ?? { items: [] }).items),
            user?.roles ?? [],
          ),
        ),
      ),
    [menuQuery.data, user?.roles],
  );
  const routeItems = useMemo(
    () =>
      dedupeRoutesByPath(
        flattenMenus(sortMenus(mergeRouteOnlySystemMenus(menuQuery.data ?? { items: [] }).items)),
      ),
    [menuQuery.data],
  );
  const homePath = useMemo(
    () =>
      menuQuery.isSuccess
        ? resolveAccessibleHomePath(menuQuery.data?.home ?? getCurrentHomePath(), accessibleRouteItems)
        : menuQuery.data?.home ?? '/',
    [accessibleRouteItems, menuQuery.data?.home, menuQuery.isSuccess],
  );

  useEffect(() => {
    if (menuQuery.isSuccess) {
      setCurrentHomePath(homePath);
    }
  }, [homePath, menuQuery.isSuccess]);

  const shellView = (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AppShell />
    </Suspense>
  );
  const shellFallback = menuQuery.isError ? (
    <ServerErrorPage />
  ) : (
    <div className="min-h-screen bg-background" />
  );

  return (
    <Routes>
      <Route
        path="/auth/login"
        element={
          bootstrapPending ? (
            <div className="min-h-screen bg-background" />
          ) : isAuthenticated ? (
            <Navigate replace to={homePath} />
          ) : (
            renderSystemPage('login', LoginPage)
          )
        }
      />
      <Route
        path="/"
        element={
          bootstrapPending ? (
            <div className="min-h-screen bg-background" />
          ) : isAuthenticated ? (
            shellView
          ) : (
            <Navigate replace to="/auth/login" />
          )
        }
      >
        <Route index element={<Navigate replace to={homePath} />} />
        {systemPageRoutes.map(({ path, key, fallback: Fallback }) => {
          return <Route key={path} path={path} element={renderSystemPage(key, Fallback)} />;
        })}
        {menuQuery.isSuccess
          ? routeItems.map((item) => (
              <Route
                key={item.id}
                path={normalizePath(item.path)}
                element={<RouteRenderer item={item} />}
              />
            ))
          : null}
        <Route
          path="*"
          element={menuQuery.isSuccess ? renderSystemPage('notFound', NotFoundPage) : shellFallback}
        />
      </Route>
      <Route
        path="*"
        element={
          <Navigate
            replace
            to={bootstrapPending ? '/' : isAuthenticated ? homePath : '/auth/login'}
          />
        }
      />
    </Routes>
  );
}
