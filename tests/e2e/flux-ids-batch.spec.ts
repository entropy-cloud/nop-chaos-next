import { expect } from '@playwright/test';
import { test, getEngineType } from '@nop-chaos/e2e-shared';
import { mockLogin as login } from '@nop-chaos/e2e-shared';

/**
 * 验证 flux CRUD 批量删除按钮的 ${ids} 参数绑定（回归：ids 空字符串问题）。
 * 运行：BASE_URL=http://localhost:4173 E2E_ENGINE=flux npx playwright test tests/e2e/flux-ids-batch.spec.ts
 * 前置：dev server 已在 4173 运行（mockMenuRoutes:false → 菜单走 dev server 的 menu-config.json，含验证页入口）。
 */
test('batch delete button sends selected row ids (not empty string)', async ({ page }) => {
  test.skip(getEngineType() !== 'flux', 'Flux-only test');
  const requests: { url: string; body: string | null }[] = [];
  page.on('request', (req) => {
    if (req.url().includes('batchDelete')) {
      requests.push({ url: req.url(), body: req.postData() });
    }
  });

  await login(page, { mockMenuRoutes: false });
  await expect(page.getByRole('button', { name: 'Flux Batch ids 验证' })).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole('button', { name: 'Flux Batch ids 验证' }).click();
  await expect(page.getByText('Batch Delete ids 验证页')).toBeVisible({ timeout: 15_000 });

  // 选择两行（checkbox: 第一个是表头全选，后三个是行选择）
  const checkboxes = page.locator('[data-slot="checkbox"]');
  await expect(checkboxes).toHaveCount(4);
  await checkboxes.nth(1).click();
  await checkboxes.nth(2).click();

  const batchButton = page.getByRole('button', { name: /批量删除/ });
  await expect(batchButton).toBeEnabled();

  await batchButton.click();

  // 批量删除请求应携带选中行键 ids=[1,2]（修复前是 ids=['']）
  await expect
    .poll(() => requests.length, { timeout: 10_000 })
    .toBeGreaterThan(0);
  const captured = requests[0];
  const allText = `${captured.url} ${captured.body ?? ''}`;
  expect(allText).toContain('1');
  expect(allText).toContain('2');
  expect(allText).not.toMatch(/ids=(%22%22|\[""\]|&)/);
});
