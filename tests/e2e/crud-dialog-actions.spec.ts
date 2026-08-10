import { expect } from '@playwright/test';
import { test, mockLogin as login } from '@nop-chaos/e2e-shared';

test('edit submit full flow: PUT body -> refresh -> renamed row visible', async ({ page }) => {
  await login(page, { username: 'proto', mockMenuRoutes: false });
  const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();
  await nav.getByRole('button', { name: '系统管理' }).click();
  await expect(nav.getByRole('button', { name: '产品管理' })).toBeVisible({ timeout: 10_000 });
  await nav.getByRole('button', { name: '产品管理' }).click();
  await expect(page.getByText('无线蓝牙耳机')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(500);

  await page
    .locator("[data-slot='crud-table'] [data-slot='table-actions'] button")
    .filter({ hasText: '编辑' })
    .first()
    .click();
  const dialog = page.locator("[data-slot='dialog-surface']").last();
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.locator('input[data-slot="input"]').nth(0).fill('改名测试');
  await dialog.getByRole('button', { name: '确认' }).click();
  await expect(dialog).toBeHidden({ timeout: 8_000 });
  await page.waitForTimeout(1000);
  const visible = await page.getByText('改名测试').isVisible().catch(() => false);
  console.log('[flow] renamed row visible after submit =', visible);
  expect(visible).toBe(true);

  // Restore mock data so subsequent tests still find 无线蓝牙耳机 (in-memory mock).
  const base = page.context();
  const restore = await base.request.put('http://127.0.0.1:4177/api/mock/products/1', {
    data: { name: '无线蓝牙耳机' },
  });
  console.log('[flow] restore status =', restore.status());
  expect(restore.status()).toBe(200);

  // Verify restore actually landed (in-memory mock shared within this playwright run).
  const check = await base.request.get('http://127.0.0.1:4177/api/mock/products?page=1&perPage=2');
  const checkJson = (await check.json()) as { data?: { items?: Array<{ name: string }> } };
  const firstName = checkJson.data?.items?.[0]?.name;
  console.log('[flow] after restore, first product name =', firstName);
  expect(firstName).toBe('无线蓝牙耳机');
});
