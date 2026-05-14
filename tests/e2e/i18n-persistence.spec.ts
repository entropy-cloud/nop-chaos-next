import { expect, test } from '@playwright/test';
import { login } from './support/auth';

const fluxEnabledSiteMapResponse = {
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
        id: 'flux-demo',
        displayName: 'Flux Demo',
        routePath: '/flux-demo',
        component: 'flux-demo',
        hidden: false,
        meta: {
          sort: 7,
          pageType: 'flux',
          schemaPath: 'mock://flux-demo',
        },
      },
      {
        id: 'settings',
        displayName: 'Settings',
        routePath: '/settings',
        component: 'settings',
        hidden: false,
        meta: { sort: 8 },
      },
    ],
  },
};

const fluxEnabledMenuResponse = {
  home: '/dashboard',
  items: [
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
      id: 'flux-demo',
      title: 'Flux Demo',
      path: '/flux-demo',
      icon: 'sparkles',
      pageType: 'flux',
      schemaPath: 'mock://flux-demo',
      sort: 7,
    },
    {
      id: 'settings',
      titleKey: 'menu.settings',
      path: '/settings',
      icon: 'settings-2',
      pageType: 'builtin',
      componentId: 'settings-home',
      sort: 8,
    },
  ],
};

async function useFluxEnabledMenu(page: import('@playwright/test').Page) {
  await page.route('**/r/SiteMapApi__getSiteMap', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fluxEnabledSiteMapResponse),
    });
  });

  await page.route('**/data/menu-config.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fluxEnabledMenuResponse),
    });
  });
}

test('english translations persist after sidebar interactions and logout', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nop-language:v1', 'en-US');
  });

  await login(page);

  const dashboardButton = page.locator('aside').getByRole('button', { name: 'Dashboard' });
  await expect(dashboardButton).toBeVisible();

  await page.locator('aside').getByRole('button', { name: 'Flow Editor' }).click();
  await expect(page.locator('aside').getByRole('button', { name: 'Flow Library' })).toBeVisible();

  const sidebarToggle = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left, svg.lucide-chevron-right') }).first();
  await sidebarToggle.click();
  await expect(page.locator('aside')).toBeVisible();
  await sidebarToggle.click();
  await expect(dashboardButton).toBeVisible();

  await expect(page.locator('aside').getByRole('button', { name: 'Settings' })).toBeVisible();

  page.on('dialog', (dialog) => dialog.accept());
  await page.locator('aside [data-testid="sidebar-user-menu-trigger"]').click();
  await page.locator('[data-testid="sidebar-user-menu-logout"]').click();

  await expect(page).toHaveURL(/#\/auth\/login$/);
  await expect(page.getByText('Username', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('auth.login');
  await expect(page.locator('body')).not.toContainText('auth.username');
  await expect
    .poll(async () => page.evaluate(() => window.localStorage.getItem('nop-language:v1')))
    .toBe('en-US');
});

test('english translations persist after visiting Flux Demo and logging out', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nop-language:v1', 'en-US');
  });

  await login(page, { setup: () => useFluxEnabledMenu(page) });
  await page.waitForLoadState('networkidle');

  await expect(page.locator('aside').getByRole('button', { name: 'Dashboard' })).toBeVisible();
  await expect(page.locator('aside').getByRole('button', { name: 'Settings' })).toBeVisible();

  await page.locator('aside').getByRole('button', { name: 'Flux Demo' }).click();
  await expect(page).toHaveURL(/#\/flux-demo$/);
  await expect(page.getByRole('main')).toContainText('Current Flux schemaPath: mock://flux-demo');

  await page.locator('aside').getByRole('button', { name: 'Dashboard' }).click();
  await expect(page).toHaveURL(/#\/dashboard$/);
  await expect(page.locator('aside').getByRole('button', { name: 'Settings' })).toBeVisible();
  await expect(page.locator('aside')).not.toContainText('menu.dashboard');
  await expect(page.locator('aside')).not.toContainText('menu.settings');

  page.on('dialog', (dialog) => dialog.accept());
  await page.locator('aside [data-testid="sidebar-user-menu-trigger"]').click();
  await page.locator('[data-testid="sidebar-user-menu-logout"]').click();

  await expect(page).toHaveURL(/#\/auth\/login$/);
  await expect(page.getByText('Username', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('auth.login');
  await expect(page.locator('body')).not.toContainText('auth.username');
  await expect(page.locator('body')).not.toContainText('login.title');
});
