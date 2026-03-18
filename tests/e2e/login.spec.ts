import { expect, test } from '@playwright/test'

test('can start from login and enter dashboard', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/auth\/login$/)

  const usernameInput = page.locator('input').first()
  const passwordInput = page.locator('input[type="password"]')
  const submitButton = page.locator('button[type="submit"]')

  await usernameInput.fill('nop')
  await passwordInput.fill('123')
  await submitButton.click()

  await expect(page).toHaveURL(/\/report\/demo\/pages\/demo$/)
  await expect(page.locator('aside')).toContainText(/报表演示|demo/i)
})
