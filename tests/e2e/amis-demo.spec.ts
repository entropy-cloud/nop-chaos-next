import { expect, test } from '@playwright/test';
import { login } from './support/auth';

test('real amis demo page renders and exposes report actions', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Amis Preview' }).click();

  await expect(page).toHaveURL(/\/amis\/preview$/);
  await expect(page.getByRole('button', { name: 'Trigger host toast' })).toBeVisible();
  await expect(page.getByText('Runtime checklist')).toBeVisible();
});
