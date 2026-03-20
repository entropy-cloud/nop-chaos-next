import { expect, test } from '@playwright/test'
import { login } from './support/auth'

test('can start from login and enter dashboard', async ({ page }) => {
  const variant = await login(page)

  if (variant === 'harbor') {
    await expect(page).toHaveURL(/#\/dashboard$/)
    await expect(page.locator('aside')).toContainText('Extension Harbor Page')
    return
  }

  await expect(page).toHaveURL(/\/report\/demo\/pages\/demo$/)
  await expect(page.locator('aside')).toContainText(/报表演示|demo/i)
})
