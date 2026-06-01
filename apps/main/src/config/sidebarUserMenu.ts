import type { ShellUserMenuItem } from '@nop-chaos/extension-host';

export type SidebarUserRouteMenuItem = ShellUserMenuItem;

export const defaultSidebarUserMenuItems: ShellUserMenuItem[] = [
  {
    id: 'settings',
    titleKey: 'settings.title',
    icon: 'settings-2',
    path: '/settings',
    pageType: 'builtin',
    componentId: 'settings-home',
    sort: 10,
  },
  {
    id: 'settings-theme',
    titleKey: 'settings.themeTitle',
    icon: 'palette',
    path: '/settings/theme',
    pageType: 'builtin',
    componentId: 'settings-theme',
    sort: 20,
  },
  {
    id: 'settings-language',
    titleKey: 'settings.languageTitle',
    icon: 'languages',
    path: '/settings/language',
    pageType: 'builtin',
    componentId: 'settings-language',
    sort: 30,
  },
  {
    id: 'help',
    titleKey: 'menu.help',
    icon: 'badge-help',
    path: '/help',
    pageType: 'builtin',
    componentId: 'help-home',
    sort: 40,
  },
  {
    id: 'help-guide',
    titleKey: 'menu.guide',
    icon: 'book-open-text',
    path: '/help/guide',
    pageType: 'builtin',
    componentId: 'help-guide',
    sort: 50,
  },
];
