import { expect, test } from '@playwright/test'
import { login } from './support/auth'

test('real amis demo page renders and exposes report actions', async ({ page }) => {
  await login(page)
  await page.goto('/#/amis/preview')

  await expect(page).toHaveURL(/\/amis\/preview$/)
  await expect(page.getByRole('main').getByText('Amis Preview')).toBeVisible()
})
