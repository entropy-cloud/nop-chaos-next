import { expect, test } from '@playwright/test';
import { login } from './support/auth';

test('can start from login and enter dashboard', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const variant = await login(page);

  if (variant === 'harbor') {
    await expect(page).toHaveURL(/#\/dashboard$/);
    await expect(page.locator('aside')).not.toContainText('Extension Harbor Page');
    expect(pageErrors, `Unexpected page errors after login: ${pageErrors.join('; ')}`).toHaveLength(0);
    return;
  }

  await expect(page).not.toHaveURL(/#\/auth\/login$/);
  await expect(page.locator('aside')).toBeVisible();
  await expect(page.locator('aside').getByRole('button', { name: 'Dashboard' })).toBeVisible();
  expect(pageErrors, `Unexpected page errors after login: ${pageErrors.join('; ')}`).toHaveLength(0);
});
