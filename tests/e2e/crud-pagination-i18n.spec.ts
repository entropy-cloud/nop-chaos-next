import { expect } from '@playwright/test';
import { test, mockLogin as login } from '@nop-chaos/e2e-shared';

const MODE = process.env.PLAYWRIGHT_APP_MODE ?? '';

test.describe('pagination range i18n', () => {
  test.skip(() => MODE !== 'flux-prototype', 'flux only');

  test('zh-CN renders 第 X-Y 条，共 N 条 (i18n key consumed)', async ({ page }) => {
    await login(page, { username: 'proto', mockMenuRoutes: false });
    const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();
    await nav.getByRole('button', { name: '系统管理' }).click();
    await expect(nav.getByRole('button', { name: '产品管理' })).toBeVisible({ timeout: 10_000 });
    await nav.getByRole('button', { name: '产品管理' }).click();
    await expect(page.getByText('无线蓝牙耳机')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(800);

    const rangeText = await page
      .locator("[data-slot='table-pagination'] .whitespace-nowrap")
      .last()
      .textContent();
    console.log('[i18n] zh range =', rangeText);
    expect(rangeText).toMatch(/第 1-10 条，共 15 条/);
  });
});
