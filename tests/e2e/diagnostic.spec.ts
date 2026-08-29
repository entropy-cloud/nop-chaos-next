import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:4173';

test('diagnostic: auth-resource page DOM', async ({ page }) => {
  // Login
  await page.goto(BASE);
  await page.waitForLoadState('networkidle');
  await page.getByLabel('用户名').fill('nop');
  await page.getByLabel('密码').fill('nop');
  await page.getByRole('button', { name: '登录' }).click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Navigate to resource page
  await page.goto(`${BASE}/#/NopAuthResource-main`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Capture full page HTML for analysis
  const html1 = await page.content();
  await page.screenshot({ path: '/tmp/diag-resource-1-loaded.png', fullPage: false });

  // Check for key selectors
  const checks: Record<string, boolean> = {};
  for (const sel of ['.nop-crud', '.nop-table', '[data-slot="crud-toolbar-main"]', '[data-slot="dialog-surface"]', '[data-slot="table-body"]', '[data-slot="table-row"]', '[data-slot="table-actions"]', '[data-slot="crud-query"]', 'text=新增', 'text=刷新']) {
    checks[sel] = await page.locator(sel).first().count().then(c => c > 0);
  }
  console.log('=== Selector checks (page loaded) ===');
  for (const [sel, found] of Object.entries(checks)) {
    console.log(`  ${sel}: ${found}`);
  }

  // Try clicking 新增
  const addBtn = page.locator('button').filter({ hasText: /新增|Add|添加/ }).first();
  const addCount = await addBtn.count();
  console.log(`\n=== 新增 button count: ${addCount} ===`);
  if (addCount > 0) {
    const btnHtml = await addBtn.evaluate(el => el.outerHTML);
    console.log(`Button HTML: ${btnHtml}`);
    await addBtn.click();
    await page.waitForTimeout(2000);
    const html2 = await page.content();
    await page.screenshot({ path: '/tmp/diag-resource-2-after-add.png', fullPage: false });

    // Check dialog visibility
    for (const sel of ['[data-slot="dialog-surface"]', '[data-slot="dialog-content"]', '[data-slot="drawer-surface"]', '[data-slot="drawer-content"]', '[role="dialog"]', '.nop-modal', '.nop-dialog']) {
      const count = await page.locator(sel).first().count();
      console.log(`  ${sel}: count=${count}`);
    }
  }

  console.log('\n=== Full HTML snippet (page loaded) ===');
  console.log(html1.substring(0, 5000));
});
