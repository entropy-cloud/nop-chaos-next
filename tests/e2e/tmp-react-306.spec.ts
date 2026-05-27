import { test } from '@playwright/test';

const liveMenuBaseUrl = process.env.PLAYWRIGHT_LIVE_MENU_URL;
const liveUsername = process.env.PLAYWRIGHT_LIVE_USERNAME ?? 'admin';
const livePassword = process.env.PLAYWRIGHT_LIVE_PASSWORD ?? '123456';

test('repro react 306 against live java menu', async ({ page }) => {
  test.skip(!liveMenuBaseUrl, 'Requires PLAYWRIGHT_LIVE_MENU_URL for the external live menu app.');

  page.on('console', (msg) => {
    console.log(`[console:${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', (error) => {
    console.log(`[pageerror] ${error.stack || error.message}`);
  });

  await page.goto(`${liveMenuBaseUrl}/auth/login`, { waitUntil: 'networkidle' });
  await page.fill('#login-username', liveUsername);
  await page.fill('#login-password', livePassword);
  console.log(`[login-body] ${await page.locator('body').innerText()}`);
  await page.getByRole('button', { name: /sign in|登录/i }).click();
  await page.waitForLoadState('networkidle');

  const primaryNavigation = page.getByRole('navigation', { name: 'Primary navigation' });
  await primaryNavigation.waitFor();
  await primaryNavigation.getByRole('button', { name: /dashboard|仪表盘/i }).waitFor();
  await page.getByRole('button', { name: /more actions|更多操作/i }).waitFor();
  await page.waitForTimeout(2000);

  console.log(`[url] ${page.url()}`);
  console.log(`[body] ${await page.locator('body').innerText()}`);
});
