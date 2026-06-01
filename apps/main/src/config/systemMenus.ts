import { flattenMenus, type MenuItem, type MenuResponse } from '@nop-chaos/shared';
import { getExtensionDefaultHomePath, resolveExtensionUserMenuItems } from '@nop-chaos/extension-host';
import { getDefaultHomePath, setCurrentHomePath } from './homePath';
import {
  defaultSidebarUserMenuItems,
  type SidebarUserRouteMenuItem,
} from './sidebarUserMenu';

export const routeOnlySystemMenuItems: MenuItem[] = [
  {
    id: 'dashboard',
    titleKey: 'menu.dashboard',
    path: '/dashboard',
    icon: 'layout-dashboard',
    pageType: 'builtin',
    componentId: 'dashboard',
    sort: 1,
  },
  {
    id: 'plugins',
    titleKey: 'menu.plugins',
    path: '/plugins',
    icon: 'puzzle',
    pageType: 'builtin',
    componentId: 'plugins-overview',
    sort: 5,
    children: [
      {
        id: 'plugins-management',
        titleKey: 'menu.pluginsManagement',
        path: '/plugins/management',
        icon: 'plug-zap',
        pageType: 'builtin',
        componentId: 'plugins-management',
      },
    ],
  },
  {
    id: 'settings',
    titleKey: 'menu.settings',
    path: '/settings',
    icon: 'settings-2',
    pageType: 'builtin',
    componentId: 'settings-home',
    sort: 7,
    children: [
      {
        id: 'settings-theme',
        titleKey: 'menu.theme',
        path: '/settings/theme',
        icon: 'palette',
        pageType: 'builtin',
        componentId: 'settings-theme',
      },
      {
        id: 'settings-language',
        titleKey: 'menu.language',
        path: '/settings/language',
        icon: 'languages',
        pageType: 'builtin',
        componentId: 'settings-language',
      },
      {
        id: 'settings-layout',
        titleKey: 'menu.layout',
        path: '/settings/layout',
        icon: 'panels-top-left',
        pageType: 'builtin',
        componentId: 'settings-layout',
      },
    ],
  },
  {
    id: 'help',
    titleKey: 'menu.help',
    path: '/help',
    icon: 'badge-help',
    pageType: 'builtin',
    componentId: 'help-home',
    sort: 8,
    children: [
      {
        id: 'help-guide',
        titleKey: 'menu.guide',
        path: '/help/guide',
        icon: 'book-open-text',
        pageType: 'builtin',
        componentId: 'help-guide',
      },
    ],
  },
];

function userMenuItemToRouteItems(item: SidebarUserRouteMenuItem): MenuItem[] {
  const childItems = item.children?.flatMap(userMenuItemToRouteItems) ?? [];

  if (!item.path || !item.pageType) {
    return childItems;
  }

  const title = item.title;
  const titleKey = item.titleKey;

  if (!title && !titleKey) {
    return childItems;
  }

  const baseItem = {
    id: `user-menu:${item.id}`,
    title,
    titleKey,
    path: item.path,
    icon: item.icon,
    pageType: item.pageType,
    componentId: item.componentId,
    pluginUrl: item.pluginUrl,
    schemaPath: item.schemaPath,
    frameSrc: item.frameSrc,
    externalUrl: item.externalUrl,
    roles: item.roles,
    sort: item.sort,
    hideInMenu: true,
  };

  return [baseItem as MenuItem, ...childItems];
}

function getRouteOnlyUserMenuItems(existingItems: MenuItem[]) {
  const existingPaths = new Set(flattenMenus(existingItems).map((item) => item.path));

  return resolveExtensionUserMenuItems(defaultSidebarUserMenuItems)
    .flatMap(userMenuItemToRouteItems)
    .filter((item) => !existingPaths.has(item.path));
}

export function cloneRouteMenuItem(item: MenuItem): MenuItem {
  return {
    ...item,
    children: item.children?.map(cloneRouteMenuItem),
  };
}

function isSameMenuItem(left: MenuItem, right: MenuItem) {
  return left.id === right.id || left.path === right.path;
}

function mergeMenuItem(existingItem: MenuItem, builtinItem: MenuItem): MenuItem {
  const children = mergeMenuItems(existingItem.children, builtinItem.children);

  return {
    ...builtinItem,
    ...existingItem,
    children,
  };
}

function mergeMenuItems(
  existingItems: MenuItem[] | undefined,
  builtinItems: MenuItem[] | undefined,
) {
  const nextItems = (existingItems ?? []).map(cloneRouteMenuItem);

  for (const builtinItem of builtinItems ?? []) {
    const existingIndex = nextItems.findIndex((item) => isSameMenuItem(item, builtinItem));

    if (existingIndex >= 0) {
      nextItems[existingIndex] = mergeMenuItem(nextItems[existingIndex], builtinItem);
      continue;
    }

    nextItems.push(cloneRouteMenuItem(builtinItem));
  }

  return nextItems.length > 0 ? nextItems : undefined;
}

function markRouteOnly(item: MenuItem): MenuItem {
  return {
    ...item,
    hideInMenu: true,
    children: item.children?.map(markRouteOnly),
  };
}

export function mergeBuiltinSystemMenus(menuResponse: MenuResponse): MenuResponse {
  const items = menuResponse.items.map(cloneRouteMenuItem);

  const availableItems = flattenMenus(items);
  const availablePaths = new Set(availableItems.map((item) => item.path));
  const extensionHome = getExtensionDefaultHomePath();
  const homeCandidate =
    menuResponse.home && availablePaths.has(menuResponse.home)
      ? menuResponse.home
      : extensionHome && availablePaths.has(extensionHome)
        ? extensionHome
        : (availableItems[0]?.path ?? getDefaultHomePath());

  const merged = {
    ...menuResponse,
    home: homeCandidate,
    items,
  };

  setCurrentHomePath(merged.home);
  return merged;
}

export function mergeRouteOnlySystemMenus(menuResponse: MenuResponse): MenuResponse {
  const systemItems = mergeMenuItems(menuResponse.items, routeOnlySystemMenuItems.map(markRouteOnly)) ?? [];

  return {
    ...menuResponse,
    items: mergeMenuItems(systemItems, getRouteOnlyUserMenuItems(systemItems)) ?? [],
  };
}
