import { expect, test } from '@playwright/test';
import { login } from './support/auth';

test('Amis Preview no longer logs outdated JSX transform warning', async ({ page }) => {
  const consoleMessages: Array<{ type: string; text: string }> = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    consoleMessages.push({ type: message.type(), text: message.text() });
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.stack || error.message);
  });

  await login(page);

  await expect(page.getByRole('button', { name: 'Amis Preview' })).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole('button', { name: 'Amis Preview' }).click();
  await expect(page).toHaveURL(/\/amis\/preview$/);
  await expect(page.getByRole('button', { name: 'Trigger host toast' })).toBeVisible({
    timeout: 30_000,
  });

  await page.getByRole('button', { name: 'Run imported @action' }).click();
  await page.getByRole('button', { name: 'Trigger host toast' }).click();
  await expect(page.getByText('Amis action binding is working')).toBeVisible({ timeout: 5_000 });
  await page.waitForTimeout(1_000);

  const outdatedJsxLogs = consoleMessages.filter((entry) =>
    entry.text.includes('Your app (or one of its dependencies) is using an outdated JSX transform.'),
  );

  expect(outdatedJsxLogs, JSON.stringify(outdatedJsxLogs, null, 2)).toHaveLength(0);
  expect(pageErrors, JSON.stringify(pageErrors, null, 2)).toHaveLength(0);
});
