import { Suspense, lazy, useMemo } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { filterMenusByRoles, flattenMenus, sortMenus } from '@nop-chaos/shared'
import { useAuth } from '../hooks/useAuth'
import { useMenuConfigQuery } from '../hooks/useMenuConfig'
import { RouteRenderer } from './RouteRenderer'
import { ForbiddenPage, LoginPage, NotFoundPage, ServerErrorPage } from './pageRegistry'

const AppShell = lazy(() => import('./AppShell').then((module) => ({ default: module.AppShell })))

function normalizePath(path: string): string {
  return path.replace(/^\//, '')
}

function dedupeRoutesByPath(items: ReturnType<typeof flattenMenus>) {
  const seenPaths = new Set<string>()

  return items.filter((item) => {
    const normalized = normalizePath(item.path)

    if (seenPaths.has(normalized)) {
      return false
    }

    seenPaths.add(normalized)
    return true
  })
}

export function AppRoutes() {
  const { isAuthenticated, user, bootstrapStatus } = useAuth()
  const bootstrapPending = bootstrapStatus === 'idle' || bootstrapStatus === 'pending'
  const menuQuery = useMenuConfigQuery(isAuthenticated && !bootstrapPending)
  const items = useMemo(
    () => dedupeRoutesByPath(flattenMenus(filterMenusByRoles(sortMenus(menuQuery.data?.items ?? []), user?.roles ?? []))),
    [menuQuery.data?.items, user?.roles]
  )

  const homePath = menuQuery.data?.home ?? '/'
  const shellView = (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <AppShell />
    </Suspense>
  )
  const shellFallback = menuQuery.isError ? <ServerErrorPage /> : <div className="min-h-screen bg-background" />

  return (
    <Routes>
      <Route path="/auth/login" element={bootstrapPending ? <div className="min-h-screen bg-background" /> : isAuthenticated ? <Navigate replace to={homePath} /> : <LoginPage />} />
      <Route path="/" element={bootstrapPending ? <div className="min-h-screen bg-background" /> : isAuthenticated ? shellView : <Navigate replace to="/auth/login" />}>
        <Route index element={<Navigate replace to={homePath} />} />
        <Route path="403" element={<ForbiddenPage />} />
        <Route path="404" element={<NotFoundPage />} />
        <Route path="500" element={<ServerErrorPage />} />
        {menuQuery.isSuccess
          ? items.map((item) => (
              <Route key={item.id} path={normalizePath(item.path)} element={<RouteRenderer item={item} />} />
            ))
          : null}
        <Route path="*" element={menuQuery.isSuccess ? <NotFoundPage /> : shellFallback} />
      </Route>
      <Route path="*" element={<Navigate replace to={bootstrapPending ? '/' : isAuthenticated ? homePath : '/auth/login'} />} />
    </Routes>
  )
}
