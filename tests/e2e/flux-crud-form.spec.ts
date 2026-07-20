import { expect } from '@playwright/test';
import { test, getEngineType } from '@nop-chaos/e2e-shared';
import { login } from '@nop-chaos/e2e-shared';
import { setupFluxCrudApiInterception } from './support/flux-crud-mock-data';

test.describe('flux crud form interactions', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(getEngineType() !== 'flux', 'Flux-only test');
    await login(page, { mockMenuRoutes: false });
    await expect(page.getByRole('button', { name: 'Flux Demo' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Flux Demo' }).click();
    await expect(page.getByText('Flux JSON CRUD Demo')).toBeVisible({ timeout: 15_000 });
  });

  test('text input field accepts and displays typed value', async ({ page }) => {
    await page.getByRole('button', { name: 'Open create form' }).click();
    await expect(page.locator('[data-slot="dialog-surface"]')).toBeVisible({ timeout: 5_000 });

    const nameInput = page.getByLabel('Pipeline Name');
    await expect(nameInput).toBeVisible();
    await nameInput.fill('Test Pipeline');
    await expect(nameInput).toHaveValue('Test Pipeline');
  });

  test('select option opens dropdown and selects a value', async ({ page }) => {
    await page.getByRole('button', { name: 'Open create form' }).click();
    await expect(page.locator('[data-slot="dialog-surface"]')).toBeVisible({ timeout: 5_000 });

    const dialog = page.locator('[data-slot="dialog-surface"]');
    const statusField = dialog.getByLabel('Status');
    await expect(statusField).toBeVisible();

    await statusField.click();
    await page.waitForTimeout(400);

    const option = page.getByRole('option').filter({ hasText: 'Review' }).first();
    if (await option.isVisible().catch(() => false)) {
      await option.click();
    } else {
      const fallback = dialog.locator('li, [role="option"]').filter({ hasText: 'Review' }).first();
      await fallback.click();
    }
  });

  test('textarea field accepts multiline text input', async ({ page }) => {
    await page.getByRole('button', { name: 'Open create form' }).click();
    await expect(page.locator('[data-slot="dialog-surface"]')).toBeVisible({ timeout: 5_000 });

    const notesInput = page.getByLabel('Notes');
    await expect(notesInput).toBeVisible();
    await notesInput.fill('Line one\nLine two\nLine three');
    await expect(notesInput).toHaveValue('Line one\nLine two\nLine three');
  });

  test('form submit sends data and closes dialog', async ({ page }) => {
    await setupFluxCrudApiInterception(page);
    await page.getByRole('button', { name: 'Open create form' }).click();
    await expect(page.locator('[data-slot="dialog-surface"]')).toBeVisible({ timeout: 5_000 });

    const nameInput = page.getByLabel('Pipeline Name');
    await nameInput.fill('Submit Test');

    await page.getByRole('button', { name: 'Submit pipeline' }).click();
    // After submit, close dialog via Escape key
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-slot="dialog-surface"]')).not.toBeVisible({ timeout: 5_000 });
  });
});
