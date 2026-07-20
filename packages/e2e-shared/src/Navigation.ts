import type { Page as PlaywrightPage } from '@playwright/test';

export async function login(page: PlaywrightPage, baseUrl?: string): Promise<void> {
  const url = baseUrl ?? 'http://127.0.0.1:4175';
  await page.goto(url);
  await page.waitForLoadState('networkidle');

  const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
  const passwordInput = page.locator('input[name="password"], input[type="password"]').first();

  if (await usernameInput.isVisible()) {
    await usernameInput.fill(process.env.E2E_USER ?? 'nop');
    await passwordInput.fill(process.env.E2E_PASSWORD ?? '123');
    await page.locator('button[type="submit"], button:has-text("登录")').click();
    await page.waitForLoadState('networkidle');
  }
}

export async function navigateTo(page: PlaywrightPage, hashRoute: string): Promise<void> {
  await page.goto(`#/${hashRoute}`);
  await page.waitForLoadState('networkidle');
}

export async function loginAndNavigate(page: PlaywrightPage, hashRoute: string, baseUrl?: string): Promise<void> {
  await login(page, baseUrl);
  await navigateTo(page, hashRoute);
}
