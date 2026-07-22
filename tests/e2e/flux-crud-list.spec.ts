import { expect } from '@playwright/test';
import { test, getEngineType } from '@nop-chaos/e2e-shared';
import { mockLogin as login } from '@nop-chaos/e2e-shared';

test.describe('flux crud list rendering', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(getEngineType() !== 'flux', 'Flux-only test');
    await login(page, { mockMenuRoutes: false });
    await expect(page.getByRole('button', { name: 'Flux Demo' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Flux Demo' }).click();
    await expect(page.getByText('Flux JSON CRUD Demo')).toBeVisible({ timeout: 15_000 });
  });

  test('crud table is visible with correct row count', async ({ page }) => {
    const rows = page.locator('tbody tr[data-slot="table-row"]');
    await expect(rows).toHaveCount(3);
  });

  test('table displays inline data correctly', async ({ page }) => {
    await expect(page.getByText('Alice')).toBeVisible();
    await expect(page.getByText('Bob')).toBeVisible();
    await expect(page.getByText('Carol')).toBeVisible();
    await expect(page.getByText('Iris Chen')).toBeVisible();
  });

  test('column headers are rendered', async ({ page }) => {
    await expect(page.getByText('Name')).toBeVisible();
    await expect(page.getByText('Owner')).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();
    await expect(page.getByText('Channel')).toBeVisible();
  });

  test('row actions buttons are present on each row', async ({ page }) => {
    const rows = page.locator('tbody tr[data-slot="table-row"]');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      await expect(row.getByRole('button', { name: 'Inspect' })).toBeVisible();
      await expect(row.getByRole('button', { name: 'Edit Form' })).toBeVisible();
    }
  });

  test('toolbar add button opens form dialog', async ({ page }) => {
    await page.getByRole('button', { name: 'Open create form' }).click();
    const dialog = page.locator('[data-slot="dialog-surface"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText('Create Flux pipeline')).toBeVisible();
  });

  test('row inspect action opens detail dialog', async ({ page }) => {
    const inspectBtn = page
      .locator('tbody tr[data-slot="table-row"]')
      .first()
      .getByRole('button', { name: 'Inspect' });
    await inspectBtn.click();

    const dialog = page.locator('[data-slot="dialog-surface"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText('Record details')).toBeVisible();
    await expect(dialog.getByText(/User: Alice/)).toBeVisible();
  });

  test('row edit action opens form with pre-filled data', async ({ page }) => {
    const editBtn = page
      .locator('tbody tr[data-slot="table-row"]')
      .first()
      .getByRole('button', { name: 'Edit Form' });
    await editBtn.click();

    const dialog = page.locator('[data-slot="dialog-surface"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText('Edit Flux pipeline')).toBeVisible();

    const nameInput = dialog.getByLabel('Pipeline Name');
    await expect(nameInput).toBeVisible();
    const value = await nameInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test('query form is visible with keyword input', async ({ page }) => {
    const keywordInput = page.getByLabel('Keyword');
    await expect(keywordInput).toBeVisible();
    await keywordInput.fill('Alice');
    await expect(keywordInput).toHaveValue('Alice');
  });
});
