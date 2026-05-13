import { expect, test } from '@playwright/test';
import { login } from './support/auth';

test('master detail list opens detail in tab and warns on unsaved leave', async ({ page }) => {
  await login(page, { username: 'admin', defaultPassword: '123456' });

  await page.getByRole('button', { name: 'Master Detail' }).click();
  await page.locator('main tbody tr').first().getByRole('button', { name: 'View' }).click();
  await expect(page).toHaveURL(/\/data-management\/master-detail\/1001$/);
  await expect(page.getByRole('main')).toBeVisible();

  await page.locator('table').first().locator('input').first().fill('已修改商品');

  const dialogPromise = new Promise<string>((resolve) => {
    page.once('dialog', async (dialog) => {
      const message = dialog.message();
      await dialog.dismiss();
      resolve(message);
    });
  });
  await page.getByRole('button', { name: /Back to list|返回列表/i }).click();
  await expect.poll(async () => dialogPromise).toMatch(/unsaved|未保存/i);
  await expect(page).toHaveURL(/\/data-management\/master-detail\//);
});
