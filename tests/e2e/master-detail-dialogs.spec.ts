import { expect, test } from '@playwright/test';
import { login } from './support/auth';

async function navigateToDetail(page: import('@playwright/test').Page) {
  await login(page, { username: 'admin', defaultPassword: '123456' });
  await page.getByRole('button', { name: 'Master Detail' }).click();
  await page.locator('main tbody tr').first().getByRole('button', { name: 'View' }).click();
  await expect(page).toHaveURL(/\/data-management\/master-detail\/1001$/);
}

test('address dialog has padding between content and edges', async ({ page }) => {
  await navigateToDetail(page);

  await page.getByRole('button', { name: /Add Address|新增地址/i }).click();

  const dialog = page.locator('[data-slot="dialog-content"]');
  await expect(dialog).toBeVisible();

  const dialogBody = dialog.locator('[data-slot="dialog-body"]');
  await expect(dialogBody).toBeVisible();

  const bodyPadding = await dialogBody.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const px = (v: string) => parseFloat(v);
    return {
      top: px(style.paddingTop),
      right: px(style.paddingRight),
      bottom: px(style.paddingBottom),
      left: px(style.paddingLeft),
    };
  });

  expect(bodyPadding.top).toBeGreaterThan(0);
  expect(bodyPadding.right).toBeGreaterThan(0);
  expect(bodyPadding.bottom).toBeGreaterThan(0);
  expect(bodyPadding.left).toBeGreaterThan(0);

  const firstInput = dialogBody.locator('input').first();
  await expect(firstInput).toBeVisible();

  const inputOffset = await firstInput.evaluate((el) => {
    const body = el.closest('[data-slot="dialog-body"]')!;
    const bodyRect = body.getBoundingClientRect();
    const inputRect = el.getBoundingClientRect();
    return {
      offsetLeft: inputRect.left - bodyRect.left,
      offsetTop: inputRect.top - bodyRect.top,
    };
  });

  expect(inputOffset.offsetLeft).toBeGreaterThan(0);
  expect(inputOffset.offsetTop).toBeGreaterThan(0);
});

test('address dialog footer has top padding (buttons not flush with border)', async ({ page }) => {
  await navigateToDetail(page);

  await page.getByRole('button', { name: /Add Address|新增地址/i }).click();

  const footer = page.locator('[data-slot="dialog-footer"]');
  await expect(footer).toBeVisible();

  const footerPadding = await footer.evaluate((el) => {
    const style = window.getComputedStyle(el);
    const px = (v: string) => parseFloat(v);
    return {
      paddingTop: px(style.paddingTop),
      paddingBottom: px(style.paddingBottom),
    };
  });

  expect(footerPadding.paddingTop).toBeGreaterThan(0);
  expect(footerPadding.paddingBottom).toBeGreaterThan(0);
});

test('logistics drawer select dropdown stays open when clicked', async ({ page }) => {
  await navigateToDetail(page);

  await page.getByRole('button', { name: /Add Logistics|新增物流/i }).click();

  const drawer = page.locator('[data-slot="drawer-content"]');
  await expect(drawer).toBeVisible();

  const selectTrigger = drawer.locator('[data-slot="select-trigger"]');
  await expect(selectTrigger).toBeVisible();
  await selectTrigger.click();

  const selectContent = page.locator('[data-slot="select-content"]');
  await expect(selectContent).toBeVisible();

  await page.waitForTimeout(500);
  await expect(selectContent).toBeVisible();

  const optionCount = await selectContent.locator('[data-slot="select-item"]').count();
  expect(optionCount).toBeGreaterThanOrEqual(3);

  const firstOption = selectContent.locator('[data-slot="select-item"]').first();
  await firstOption.click();

  await expect(selectContent).toBeHidden({ timeout: 2000 });
});

test('logistics drawer date input is functional', async ({ page }) => {
  await navigateToDetail(page);

  await page.getByRole('button', { name: /Add Logistics|新增物流/i }).click();

  const drawer = page.locator('[data-slot="drawer-content"]');
  await expect(drawer).toBeVisible();

  const dateInput = drawer.locator('input[type="date"]');
  await expect(dateInput).toBeVisible();

  const isEditable = await dateInput.evaluate((el) => {
    const input = el as HTMLInputElement;
    return !input.disabled && !input.readOnly;
  });
  expect(isEditable).toBe(true);

  await dateInput.fill('2025-12-31');
  await expect(dateInput).toHaveValue('2025-12-31');
});
