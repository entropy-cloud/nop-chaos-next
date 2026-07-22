import { expect } from '@playwright/test';
import { test, mockLogin as login } from '@nop-chaos/e2e-shared';
import { demoRoutesMenuResponse, useSeededDemoMenu } from './support/demoRoutes';

test('plugin demo reuses host navigation and shared shell context with seeded demo routes', async ({
  page,
}) => {
  await login(page, {
    setup: () => useSeededDemoMenu(page),
  });

  await page
    .getByText(/plugin demo/i)
    .first()
    .click();
  await expect(page).toHaveURL(/\/plugins\/demo$/);
  await expect(page.locator('main')).not.toContainText('p[1] is not a function');
  await expect(page.getByText('Plugin operations lens')).toBeVisible();
  await expect(page.getByText(/route \/plugins\/demo|路由 \/plugins\/demo/)).toBeVisible();
  await expect(page.getByText(/Custom analytics|自定义分析/)).toBeVisible();

  const chart = page.locator('[data-testid="plugin-analytics-chart"]');
  await expect(chart).toBeVisible();

  await page
    .locator('main')
    .getByRole('button', { name: /插件管理|Plugin management/ })
    .click();

  await expect(page).toHaveURL(/\/plugins\/management$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/插件管理|Plugin management/);
});
