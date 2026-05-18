import { flattenMenus, type MenuItem, type MenuResponse } from '@nop-chaos/shared';
import { getExtensionDefaultHomePath, hasMenuOverride } from '@nop-chaos/extension-host';
import { getDefaultHomePath, setCurrentHomePath } from './homePath';

const builtinSystemMenuItems: MenuItem[] = [
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

function cloneMenuItem(item: MenuItem): MenuItem {
  return {
    ...item,
    children: item.children?.map(cloneMenuItem),
  };
}

function hideMenuItem(item: MenuItem): MenuItem {
  return {
    ...item,
    hideInMenu: true,
    children: item.children?.map(hideMenuItem),
  };
}

function isSameMenuItem(left: MenuItem, right: MenuItem) {
  return left.id === right.id || left.path === right.path;
}

function mergeMenuItem(existingItem: MenuItem, builtinItem: MenuItem): MenuItem {
  return {
    ...builtinItem,
    ...existingItem,
    children: mergeMenuItems(existingItem.children, builtinItem.children),
  };
}

function mergeMenuItems(
  existingItems: MenuItem[] | undefined,
  builtinItems: MenuItem[] | undefined,
) {
  const nextItems = (existingItems ?? []).map(cloneMenuItem);

  for (const builtinItem of builtinItems ?? []) {
    const existingIndex = nextItems.findIndex((item) => isSameMenuItem(item, builtinItem));

    if (existingIndex >= 0) {
      nextItems[existingIndex] = mergeMenuItem(nextItems[existingIndex], builtinItem);
      continue;
    }

    nextItems.push(cloneMenuItem(builtinItem));
  }

  return nextItems.length > 0 ? nextItems : undefined;
}

export function mergeBuiltinSystemMenus(menuResponse: MenuResponse): MenuResponse {
  // System pages (settings, help, etc.) should always be available,
  // even when overrideMenus is true. They are accessed from the user menu,
  // not from the sidebar navigation.
  if (hasMenuOverride()) {
    const items =
      mergeMenuItems(menuResponse.items, builtinSystemMenuItems.map(hideMenuItem)) ?? [];
    const availablePaths = new Set(flattenMenus(items).map((item) => item.path));
    const homeCandidate =
      menuResponse.home && availablePaths.has(menuResponse.home)
        ? menuResponse.home
        : (menuResponse.items[0]?.path ?? '/');

    const merged = {
      ...menuResponse,
      home: homeCandidate,
      items,
    };

    setCurrentHomePath(merged.home);
    return merged;
  }

  const items = mergeMenuItems(menuResponse.items, builtinSystemMenuItems) ?? [];

  const availablePaths = new Set(flattenMenus(items).map((item) => item.path));
  const extensionHome = getExtensionDefaultHomePath();
  const homeCandidate =
    menuResponse.home && availablePaths.has(menuResponse.home)
      ? menuResponse.home
      : extensionHome && availablePaths.has(extensionHome)
        ? extensionHome
        : getDefaultHomePath();

  const merged = {
    ...menuResponse,
    home: homeCandidate,
    items,
  };

  setCurrentHomePath(merged.home);
  return merged;
}
