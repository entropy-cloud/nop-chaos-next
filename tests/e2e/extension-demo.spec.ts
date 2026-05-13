import { expect, test } from '@playwright/test';
import { login } from './support/auth';

test.skip(
  process.env.PLAYWRIGHT_APP_MODE !== 'extension-demo',
  'Extension Harbor assertions only apply in extension-demo mode.',
);

test('extension demo alias mode loads Harbor login and builtin page', async ({ page }) => {
  const loginVariant = await login(page);
  expect(loginVariant).toBe('harbor');

  await expect(page).toHaveURL(/#\/dashboard$/);
  await page.goto('/#/examples/extension-harbor');
  await expect(page.getByText('Extension Builtin Page')).toBeVisible();
  await expect(page.getByText('How it works')).toBeVisible();
  await expect(page.locator('aside')).toContainText('Extension Harbor Page');
});
