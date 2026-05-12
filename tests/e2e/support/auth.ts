import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export type LoginVariant = 'harbor' | 'default';

interface LoginOptions {
  setup?: () => Promise<void> | void;
  username?: string;
  defaultPassword?: string;
  harborPassword?: string;
}

export async function login(page: Page, options: LoginOptions = {}): Promise<LoginVariant> {
  const { setup, username, defaultPassword = '123456', harborPassword = '123456' } = options;

  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await setup?.();
  await page.goto('/#/auth/login');

  const harborHeading = page.getByText('Harbor Sign-in');
  const isHarborLogin = await harborHeading
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (isHarborLogin) {
    await page.getByLabel('Username').fill(username ?? 'harbor');
    await page.getByLabel('Password').fill(harborPassword);
    await page.getByRole('button', { name: /Enter Harbor/i }).click();
    await expect(page).not.toHaveURL(/#\/auth\/login$/);
    return 'harbor';
  }

  const usernameInput = page.locator('input').first();
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');

  await expect(submitButton).toBeVisible();
  await usernameInput.fill(username ?? 'nop');
  await passwordInput.fill(defaultPassword);
  await submitButton.click();
  await expect(page).not.toHaveURL(/#\/auth\/login$/);

  return 'default';
}
