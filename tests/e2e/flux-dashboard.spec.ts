import { expect } from '@playwright/test';
import { test, getEngineType } from '@nop-chaos/e2e-shared';
import { login } from '@nop-chaos/e2e-shared';

test.describe('flux dashboard page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(getEngineType() !== 'flux', 'Flux-only test');
    await login(page, { mockMenuRoutes: false });
    await expect(page.getByRole('button', { name: 'Flux Dashboard' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Flux Dashboard' }).click();
    await expect(page.getByText('Flux Dashboard Demo')).toBeVisible({ timeout: 15_000 });
  });

  test('page title is displayed', async ({ page }) => {
    await expect(page.getByText('Flux Dashboard Demo')).toBeVisible();
  });

  test('KPI metric table renders with data', async ({ page }) => {
    await expect(page.getByText('KPI Overview')).toBeVisible();
    await expect(page.getByText('Total Users')).toBeVisible();
    await expect(page.getByText('Total Orders')).toBeVisible();
    await expect(page.getByText('Revenue')).toBeVisible();
    await expect(page.getByText('Conversion')).toBeVisible();
    await expect(page.getByText('1,280')).toBeVisible();
    await expect(page.getByText('456')).toBeVisible();
  });

  test('chart section is present with data', async ({ page }) => {
    await expect(page.getByText('Charts')).toBeVisible();
    await expect(page.getByText('Jan')).toBeVisible();
    await expect(page.getByText('Jun')).toBeVisible();
    await expect(page.getByText('Sales')).toBeVisible();
  });

  test('recent orders section displays data', async ({ page }) => {
    await expect(page.getByText('Recent Orders')).toBeVisible();
    await expect(page.getByText('ORD-001')).toBeVisible();
    await expect(page.getByText('ORD-005')).toBeVisible();
    await expect(page.getByText('Alice')).toBeVisible();
    await expect(page.getByText('Carol')).toBeVisible();
  });
});
