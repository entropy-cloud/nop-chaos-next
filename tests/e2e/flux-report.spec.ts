import { expect } from '@playwright/test';
import { test, getEngineType } from '@nop-chaos/e2e-shared';
import { login } from '@nop-chaos/e2e-shared';

test.describe('flux report page', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(getEngineType() !== 'flux', 'Flux-only test');
    await login(page, { mockMenuRoutes: false });
    await expect(page.getByRole('button', { name: 'Flux Report' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Flux Report' }).click();
    await expect(page.getByText('Flux Report Demo')).toBeVisible({ timeout: 15_000 });
  });

  test('page title is displayed', async ({ page }) => {
    await expect(page.getByText('Flux Report Demo')).toBeVisible();
  });

  test('report table has correct rows and column headers', async ({ page }) => {
    const rows = page.locator('tbody tr[data-slot="table-row"]');
    await expect(rows).toHaveCount(6);
    await expect(page.getByText('Report ID')).toBeVisible();
    await expect(page.getByText('Title')).toBeVisible();
    await expect(page.getByText('Author')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
    await expect(page.getByText('Views')).toBeVisible();
  });

  test('search form is visible with keyword input', async ({ page }) => {
    await expect(page.getByLabel('Search')).toBeVisible();
    await page.getByLabel('Search').fill('Sales');
    await expect(page.getByLabel('Search')).toHaveValue('Sales');
  });

  test('toolbar export all button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Export All' })).toBeVisible();
  });

  test('row action buttons are present', async ({ page }) => {
    const firstRow = page.locator('tbody tr[data-slot="table-row"]').first();
    await expect(firstRow.getByRole('button', { name: 'View' })).toBeVisible();
    await expect(firstRow.getByRole('button', { name: 'Export' })).toBeVisible();
  });

  test('view button opens detail dialog', async ({ page }) => {
    const viewBtn = page.locator('tbody tr[data-slot="table-row"]').first()
      .getByRole('button', { name: 'View' });
    await viewBtn.click();
    const dialog = page.locator('[data-slot="dialog-surface"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText('Report Detail')).toBeVisible();
  });
});
