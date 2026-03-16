import type { MenuItem } from '../types/menu'

function pathToSegments(path: string): string[] {
  return path.replace(/(^\/+|\/+?$)/g, '').split('/').filter(Boolean)
}

export function matchMenuPath(routePath: string, currentPath: string): boolean {
  if (routePath === currentPath) {
    return true
  }

  const routeSegments = pathToSegments(routePath)
  const currentSegments = pathToSegments(currentPath)

  if (routeSegments.length !== currentSegments.length) {
    return false
  }

  return routeSegments.every((segment, index) => segment.startsWith(':') || segment === currentSegments[index])
}

export function flattenMenus(items: MenuItem[]): MenuItem[] {
  const result: MenuItem[] = []

  for (const item of items) {
    result.push(item)
    if (item.children?.length) {
      result.push(...flattenMenus(item.children))
    }
  }

  return result
}

export function findMenuItemByPath(items: MenuItem[], currentPath: string): MenuItem | undefined {
  for (const item of items) {
    if (matchMenuPath(item.path, currentPath)) {
      return item
    }

    if (item.children?.length) {
      const nested = findMenuItemByPath(item.children, currentPath)
      if (nested) {
        return nested
      }
    }
  }

  return undefined
}

export function collectBreadcrumbTrail(items: MenuItem[], currentPath: string, trail: MenuItem[] = []): MenuItem[] {
  for (const item of items) {
    const nextTrail = [...trail, item]

    if (matchMenuPath(item.path, currentPath)) {
      return nextTrail
    }

    if (item.children?.length) {
      const nested = collectBreadcrumbTrail(item.children, currentPath, nextTrail)
      if (nested.length > 0) {
        return nested
      }
    }
  }

  return []
}

export function filterMenusByRoles(items: MenuItem[], userRoles: string[]): MenuItem[] {
  return items
    .filter((item) => {
      if (!item.roles || item.roles.length === 0) {
        return true
      }

      const allowed = new Set(item.roles)
      return userRoles.some((role) => allowed.has(role))
    })
    .map((item) => ({
      ...item,
      children: item.children ? filterMenusByRoles(item.children, userRoles) : undefined
    }))
}

export function sortMenus(items: MenuItem[]): MenuItem[] {
  return [...items]
    .sort((left: MenuItem, right: MenuItem) => (left.sort ?? 0) - (right.sort ?? 0))
    .map((item) => ({
      ...item,
      children: item.children ? sortMenus(item.children) : undefined
    }))
}
