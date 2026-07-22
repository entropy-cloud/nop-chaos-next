import { expect } from '@playwright/test';
import { mockLogin as login, test } from '@nop-chaos/e2e-shared';

test.describe('AMIS Tabs form rendering', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    // Navigate via sidebar menu item
    await page.getByRole('button', { name: 'AMIS Tabs Test' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('tab content renders inside dialog with form items', async ({ page }) => {
    // Check if CRUD table rendered
    const table = page.locator('.cxd-Table, table').first();
    await expect(table).toBeVisible({ timeout: 15_000 });

    // Click the first row's "View" button to open dialog
    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByRole('button', { name: 'View' }).click();
    await page.waitForTimeout(2000);

    // Check dialog opened
    const dialog = page.locator('.cxd-Modal, .cxd-Dialog').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // THE KEY ASSERTION: tab content should have form items
    const formItems = dialog.locator('.cxd-Form-item');
    const formItemCount = await formItems.count();
    console.log(`Form items in dialog: ${formItemCount}`);

    // Check if first tab has rendered input fields
    const inputsInDialog = dialog.locator('input[name], textarea[name]');
    const inputCount = await inputsInDialog.count();
    console.log(`Named inputs in dialog: ${inputCount}`);

    // If tab content didn't render, this is the AMIS+React19 Tabs issue
    expect(formItemCount).toBeGreaterThan(0);
    expect(inputCount).toBeGreaterThan(0);

    // Verify field names
    const fieldNames: string[] = [];
    for (let i = 0; i < inputCount; i++) {
      const name = await inputsInDialog.nth(i).getAttribute('name');
      if (name) fieldNames.push(name);
    }
    console.log(`Field names: ${fieldNames.join(', ')}`);
    expect(fieldNames).toContain('name');

    await page.keyboard.press('Escape');
  });

  test('tab content renders in add dialog', async ({ page }) => {
    // Wait for table
    await expect(page.locator('.cxd-Table, table').first()).toBeVisible({ timeout: 15_000 });

    // Click "Add" button in first row
    const firstRow = page.locator('tbody tr').first();
    await firstRow.getByRole('button', { name: 'Add' }).click();
    await page.waitForTimeout(2000);

    const dialog = page.locator('.cxd-Modal, .cxd-Dialog').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Check form items
    const formItems = dialog.locator('.cxd-Form-item');
    const count = await formItems.count();
    console.log(`Add dialog form items: ${count}`);

    // Check if textarea field exists (tests the formField fix)
    const textareas = dialog.locator('textarea[name]');
    const textareaCount = await textareas.count();
    console.log(`Textareas in dialog: ${textareaCount}`);

    expect(count).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
  });
});
