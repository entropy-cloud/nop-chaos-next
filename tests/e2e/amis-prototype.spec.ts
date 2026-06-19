import { expect, test } from '@playwright/test';

/**
 * AMIS Prototype Demo end-to-end tests.
 *
 * Run with: pnpm test:e2e:amis-prototype
 *
 * Verifies:
 * - Two-level menu loaded from prototype menu.json
 * - CRUD AMIS pages rendered from x:extends-resolved JSON
 * - Mock CRUD API (list / create)
 */

async function login(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.route('**/r/LoginApi__login?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'mock-token:proto',
        expiresIn: 300,
        refreshToken: 'mock-refresh',
        refreshExpiresIn: 86400,
        userInfo: {
          username: 'proto',
          nickname: 'Proto User',
          email: 'proto@ex.com',
          roles: [{ value: 'admin' }],
        },
      }),
    });
  });

  await page.goto('/#/auth/login');
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('input').first().fill('proto');
  await passwordInput.fill('123456');
  await page.locator('button[type="submit"]').click();
}

test('prototype menu loads two-level navigation with CRUD pages', async ({ page }) => {
  await login(page);

  const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();

  // Two-level menu loaded from prototype server.
  await expect(nav.getByRole('button', { name: '系统管理' })).toBeVisible({ timeout: 20_000 });
  await expect(nav.getByRole('button', { name: '内容管理' })).toBeVisible();

  // Expand 系统管理 and navigate to 用户管理
  await nav.getByRole('button', { name: '系统管理' }).click();
  await nav.getByRole('button', { name: '用户管理' }).click();

  // CRUD page should render with x:extends resolved schema.
  await expect(page.getByRole('button', { name: '新增用户' })).toBeVisible({ timeout: 20_000 });

  // Mock data should appear (5 seeded users).
  await expect(page.getByText('张三')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('zhangsan@example.com')).toBeVisible();
});

test('CRUD create: add a new user via dialog', async ({ page }) => {
  await login(page);

  const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();

  await nav.getByRole('button', { name: '系统管理' }).click();
  await nav.getByRole('button', { name: '用户管理' }).click();
  await expect(page.getByRole('button', { name: '新增用户' })).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: '新增用户' }).click();

  // Dialog form should appear
  await expect(page.locator('.cxd-Modal')).toBeVisible();

  // Fill form — use AMIS field labels
  const nameLabel = page.locator('.cxd-Form-item').filter({ hasText: '姓名' });
  await nameLabel.locator('input').fill('测试用户');

  const emailLabel = page.locator('.cxd-Form-item').filter({ hasText: '邮箱' });
  await emailLabel.locator('input').fill('test@example.com');

  // Submit the dialog form (AMIS default English labels)
  await page.locator('.cxd-Modal').getByRole('button', { name: 'Confirm' }).click();

  // New user should appear in the list
  await expect(page.getByText('测试用户')).toBeVisible({ timeout: 10_000 });
});

test('second group 内容管理 shows articles CRUD', async ({ page }) => {
  await login(page);

  const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();

  await expect(nav.getByRole('button', { name: '内容管理' })).toBeVisible({ timeout: 20_000 });
  await nav.getByRole('button', { name: '内容管理' }).click();
  await nav.getByRole('button', { name: '文章管理' }).click();

  await expect(page.getByRole('button', { name: '新增文章' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('AMIS 入门指南')).toBeVisible({ timeout: 10_000 });
});
