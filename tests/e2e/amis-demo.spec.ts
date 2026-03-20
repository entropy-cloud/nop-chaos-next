import { expect, test } from '@playwright/test'
import { login } from './support/auth'

test('real amis demo page renders and exposes report actions', async ({ page }) => {
  await login(page)
  await page.goto('/#/amis/preview')

  await expect(page).toHaveURL(/\/amis\/preview$/)
  await expect(page.locator('.cxd-Page')).toBeVisible()
  await expect(page.getByRole('main').getByText('Amis Preview')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Run imported @action' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Trigger host toast' })).toBeVisible()
})
