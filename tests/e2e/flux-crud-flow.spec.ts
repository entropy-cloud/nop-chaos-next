import { expect } from '@playwright/test';
import { test, getEngineType } from '@nop-chaos/e2e-shared';
import { login } from '@nop-chaos/e2e-shared';
import { setupFluxCrudApiInterception } from './support/flux-crud-mock-data';

test.describe('flux crud full flow', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(getEngineType() !== 'flux', 'Flux-only test');
    await setupFluxCrudApiInterception(page);
    await login(page, { mockMenuRoutes: false });
    await expect(page.getByRole('button', { name: 'Flux Demo' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Flux Demo' }).click();
    await expect(page.getByText('Flux JSON CRUD Demo')).toBeVisible({ timeout: 15_000 });
  });

  test('create flow: open dialog → fill → submit → close', async ({ page }) => {
    await page.getByRole('button', { name: 'Open create form' }).click();
    const dialog = page.locator('[data-slot="dialog-surface"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText('Create Flux pipeline')).toBeVisible();

    await dialog.getByLabel('Pipeline Name').fill('Flow Test Pipeline');
    await dialog.getByLabel('Notes').fill('Created during flow test');

    await page.getByRole('button', { name: 'Submit pipeline' }).click();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });

  test('edit flow: open edit dialog → modify → submit → close', async ({ page }) => {
    const editBtn = page.locator('tbody tr[data-slot="table-row"]').first()
      .getByRole('button', { name: 'Edit Form' });
    await editBtn.click();

    const dialog = page.locator('[data-slot="dialog-surface"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText('Edit Flux pipeline')).toBeVisible();

    const nameInput = dialog.getByLabel('Pipeline Name');
    await nameInput.fill('Edited Pipeline Name');

    const notesInput = dialog.getByLabel('Notes');
    await notesInput.fill('Updated notes during edit flow');

    await page.getByRole('button', { name: 'Save Changes' }).click();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });
  });
});
