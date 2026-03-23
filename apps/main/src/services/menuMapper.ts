import type { MenuItem, MenuResponse } from '@nop-chaos/shared'
import { validateMenuResponse } from '@nop-chaos/shared'
import { mergeExtensionMenus } from '../extensions/runtime'

export interface LegacySiteMapResource {
  id: string
  routePath?: string
  hidden?: boolean
  component?: string
  keepAlive?: boolean
  icon?: string
  url?: string
  displayName?: string
  target?: string
  children?: LegacySiteMapResource[]
  meta?: Record<string, unknown>
  roles?: string[]
  permissions?: string[]
  permissionList?: string[]
}

export interface LegacySiteMapResponse {
  supportDebug?: boolean
  resources?: LegacySiteMapResource[]
  children?: LegacySiteMapResource[]
}

const builtinComponentIdMap = new Map<string, string>([
  ['dashboard/analysis', 'dashboard'],
  ['dashboard', 'dashboard'],
  ['ai/workbench', 'ai-workbench'],
  ['ai-workbench', 'ai-workbench'],
  ['flow/editor', 'flow-editor'],
  ['flow-editor', 'flow-editor'],
  ['flow/editor/:id', 'flow-editor-edit'],
  ['flow-editor/:id', 'flow-editor-edit'],
  ['data/management', 'data-management'],
  ['data-management', 'data-management'],
  ['data-management/master-detail', 'master-detail'],
  ['data-management/master-detail/:id', 'master-detail-detail'],
  ['plugins/management', 'plugins-management'],
  ['plugins', 'plugins-overview'],
  ['settings/theme', 'settings-theme'],
  ['settings/language', 'settings-language'],
  ['settings/layout', 'settings-layout'],
  ['settings', 'settings-home'],
  ['help/guide', 'help-guide'],
  ['help', 'help-home']
])

function toMenuPath(routePath: string | undefined, fallbackId: string) {
  if (!routePath) {
    return `/${fallbackId}`
  }

  return routePath.startsWith('/') ? routePath : `/${routePath}`
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function normalizeComponentKey(component?: string) {
  return component?.replace(/^\//, '').replace(/\.(vue|tsx)$/, '').replace(/\/index$/, '')
}

function toPageType(resource: LegacySiteMapResource): MenuItem['pageType'] {
  const componentKey = normalizeComponentKey(resource.component)

  if (componentKey === 'plugin' && resource.url) {
    return 'plugin'
  }

  if (resource.component === 'AMIS') {
    return 'amis'
  }

  if (resource.component === 'IFRAME') {
    return resource.target === 'external' ? 'external' : 'iframe'
  }

  return 'builtin'
}

function toBuiltinComponentId(resource: LegacySiteMapResource, path: string) {
  const componentKey = normalizeComponentKey(resource.component)

  if (componentKey && builtinComponentIdMap.has(componentKey)) {
    return builtinComponentIdMap.get(componentKey)
  }

  const normalizedPath = path.replace(/^\//, '')

  if (builtinComponentIdMap.has(normalizedPath)) {
    return builtinComponentIdMap.get(normalizedPath)
  }

  if (normalizedPath === 'dashboard') {
    return 'dashboard'
  }

  return normalizedPath.replace(/\//g, '-')
}

function toIcon(icon?: string): string | undefined {
  return icon
}

function extractRoles(resource: LegacySiteMapResource) {
  if (isStringArray(resource.roles)) {
    return resource.roles
  }

  if (isStringArray(resource.permissions)) {
    return resource.permissions
  }

  if (isStringArray(resource.permissionList)) {
    return resource.permissionList
  }

  if (isStringArray(resource.meta?.roles)) {
    return resource.meta.roles
  }

  if (typeof resource.meta?.roles === 'string') {
    return resource.meta.roles.split(',').map((item) => item.trim()).filter(Boolean)
  }

  return undefined
}

function getSiteMapResources(payload: LegacySiteMapResponse) {
  if (Array.isArray(payload.resources)) {
    return payload.resources
  }

  if (Array.isArray(payload.children)) {
    return payload.children
  }

  return []
}

function findLeafHomePath(items: MenuItem[]): string | undefined {
  for (const item of items) {
    if (item.children?.length) {
      const nestedPath = findLeafHomePath(item.children)

      if (nestedPath) {
        return nestedPath
      }
    }

    if (!item.hideInMenu) {
      return item.path
    }
  }

  return undefined
}

function mapLegacyResource(resource: LegacySiteMapResource): MenuItem {
  const path = toMenuPath(resource.routePath, resource.id)
  const pageType = toPageType(resource)
  const roles = extractRoles(resource)
  const componentId = pageType === 'plugin' ? resource.id : pageType === 'builtin' ? toBuiltinComponentId(resource, path) : undefined

  return {
    id: resource.id,
    title: resource.displayName,
    path,
    icon: toIcon(resource.icon),
    pageType,
    componentId,
    pluginUrl: pageType === 'plugin' ? resource.url : undefined,
    schemaPath: pageType === 'amis' ? resource.url : undefined,
    frameSrc: pageType === 'iframe' ? resource.url : undefined,
    externalUrl: pageType === 'external' ? resource.url : undefined,
    sort: typeof resource.meta?.sort === 'number' ? resource.meta.sort : undefined,
    hideInMenu: resource.hidden,
    roles,
    children: resource.children?.map(mapLegacyResource)
  }
}

export function mapLegacySiteMapToMenuResponse(payload: LegacySiteMapResponse): MenuResponse {
  const items = getSiteMapResources(payload).map(mapLegacyResource)

  return mergeExtensionMenus(validateMenuResponse({
    home: findLeafHomePath(items) ?? '/',
    items
  }))
}
