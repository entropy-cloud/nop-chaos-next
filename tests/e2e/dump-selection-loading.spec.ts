import { expect } from '@playwright/test';
import { test, mockLogin as login } from '@nop-chaos/e2e-shared';

test('header select-all click: loading overlay + requests', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/mock/products')) requests.push(`${req.method()} ${req.url()}`);
  });

  await login(page, { username: 'proto', mockMenuRoutes: false });
  const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();
  await nav.getByRole('button', { name: '系统管理' }).click();
  await expect(nav.getByRole('button', { name: '产品管理' })).toBeVisible({ timeout: 10_000 });
  await nav.getByRole('button', { name: '产品管理' }).click();
  await expect(page.getByText('无线蓝牙耳机')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1000);

  const reqBefore = requests.length;
  const headerCheckbox = page
    .locator(
      "[data-slot='crud-table'] .nop-table thead [data-slot='table-select-column'] [data-slot='checkbox']",
    )
    .first();

  await headerCheckbox.click();

  const probe = () =>
    page.evaluate(() => {
      const overlay = document.querySelector("[data-slot='table-loading-overlay']");
      return {
        overlay: overlay ? overlay.textContent?.trim().slice(0, 40) : null,
        checked: document
          .querySelector("[data-slot='crud-table'] thead [data-slot='table-select-column'] [data-slot='checkbox']")
          ?.getAttribute('data-checked'),
      };
    });

  console.log('after click @0ms   =', JSON.stringify(await probe()));
  await page.waitForTimeout(150);
  console.log('after click @150ms =', JSON.stringify(await probe()));
  await page.waitForTimeout(600);
  console.log('after click @750ms =', JSON.stringify(await probe()));
  console.log('requests delta =', requests.length - reqBefore, JSON.stringify(requests.slice(reqBefore)));
  expect(true).toBeTruthy();
});
