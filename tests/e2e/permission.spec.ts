import { expect, test } from '@playwright/test';
import { login } from './support/auth';
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
        id: 'plugins',
        displayName: 'Plugins',
        routePath: '/plugins',
        component: 'plugins',
        hidden: false,
        meta: { sort: 5 },
        children: [
          {
            id: 'plugins-management',
            displayName: 'Plugin Management',
            routePath: '/plugins/management',
            component: 'plugins/management',
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
      id: 'plugins',
      title: 'Plugins',
      path: '/plugins',
      icon: 'puzzle',
      pageType: 'builtin',
      componentId: 'plugins-overview',
      sort: 5,
      children: [
        {
          id: 'plugins-management',
          title: 'Plugin Management',
          path: '/plugins/management',
          icon: 'plug-zap',
          pageType: 'builtin',
          componentId: 'plugins-management',
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
  await expect(navigation).toContainText('Plugins');
  await expect(navigation).not.toContainText('Plugin Management');

  await page.goto('/#/plugins/management');

  await expect(page).toHaveURL(/#\/plugins\/management$/);
  await expect(page.getByText('Access denied')).toBeVisible();
  await expect(
    page.getByText('Your current role set does not permit access to this route.'),
  ).toBeVisible();
});
