import { expect } from '@playwright/test';
import { test } from '@nop-chaos/e2e-shared';
import { mockLogin as login } from '@nop-chaos/e2e-shared';
const restrictedSiteMapResponse = {
  status: 0,
  data: {
    children: [
      {
        id: 'dashboard',
        displayName: 'Dashboard',
        routePath: '/dashboard',
        component: 'dashboard',
        hidden: false,
        meta: { sort: 1 },
      },
      {
        id: 'settings',
        displayName: 'Settings',
        routePath: '/settings',
        component: 'settings',
        hidden: false,
        meta: { sort: 5 },
        children: [
          {
            id: 'settings-theme',
            displayName: 'Theme Settings',
            routePath: '/settings/theme',
            component: 'settings/theme',
            hidden: false,
            meta: { roles: ['super-admin'] },
          },
        ],
      },
    ],
  },
};

const restrictedMenuResponse = {
  home: '/dashboard',
  items: [
    {
      id: 'dashboard',
      title: 'Dashboard',
      path: '/dashboard',
      icon: 'layout-dashboard',
      pageType: 'builtin',
      componentId: 'dashboard',
      sort: 1,
    },
    {
      id: 'settings',
      title: 'Settings',
      path: '/settings',
      icon: 'settings',
      pageType: 'builtin',
      componentId: 'settings-home',
      sort: 5,
      children: [
        {
          id: 'settings-theme',
          title: 'Theme Settings',
          path: '/settings/theme',
          icon: 'palette',
          pageType: 'builtin',
          componentId: 'settings-theme',
          roles: ['super-admin'],
        },
      ],
    },
  ],
};

test('permission routes hide restricted menus but reject direct URL access with forbidden page', async ({
  page,
}) => {
  await login(page, {
    setup: async () => {
      await page.route('**/r/SiteMapApi__getSiteMap', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(restrictedSiteMapResponse),
        });
      });

      await page.route('**/data/menu-config.json', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(restrictedMenuResponse),
        });
      });
    },
  });

  const navigation = page.locator('nav[aria-label="Primary navigation"]').first();
  await expect(navigation).toContainText('Dashboard');
  await expect(navigation).toContainText('Settings');
  await expect(navigation).not.toContainText('Theme Settings');

  await page.goto('/#/settings/theme');

  await expect(page).toHaveURL(/#\/settings\/theme$/);
  await expect(page.getByText('Access denied')).toBeVisible();
  await expect(
    page.getByText('Your current role set does not permit access to this route.'),
  ).toBeVisible();
});
