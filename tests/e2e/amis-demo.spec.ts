import { expect } from '@playwright/test';
import { login, test } from '@nop-chaos/e2e-shared';

test('real amis demo page renders and exposes report actions', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Amis Preview' }).click();

  await expect(page).toHaveURL(/\/amis\/preview$/);
  await expect(page.getByRole('button', { name: 'Trigger host toast' })).toBeVisible();
  await expect(page.getByText('Runtime checklist')).toBeVisible();
});
