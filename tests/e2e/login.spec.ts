import { expect } from '@playwright/test';
import { test, mockLogin as login, waitForSidebar } from '@nop-chaos/e2e-shared';

test('can start from login and enter dashboard', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const variant = await login(page);

  if (variant === 'harbor') {
    await expect(page).toHaveURL(/#\/dashboard$/);
    await expect(page.locator('aside')).not.toContainText('Extension Harbor Page');
    expect(pageErrors, `Unexpected page errors after login: ${pageErrors.join('; ')}`).toHaveLength(
      0,
    );
    return;
  }

  await expect(page).not.toHaveURL(/#\/auth\/login$/);
  await waitForSidebar(page);
  expect(pageErrors, `Unexpected page errors after login: ${pageErrors.join('; ')}`).toHaveLength(
    0,
  );
});
