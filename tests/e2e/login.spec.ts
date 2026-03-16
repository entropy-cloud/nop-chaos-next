import { expect, test } from '@playwright/test'

test('can start from login and enter dashboard', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveURL(/\/auth\/login$/)

  const usernameInput = page.locator('input').first()
  const passwordInput = page.locator('input[type="password"]')
  const submitButton = page.locator('button[type="submit"]')

  await usernameInput.fill('admin')
  await passwordInput.fill('123456')
  await submitButton.click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/运营总览|Operations dashboard/)
  await expect(page.locator('aside')).toContainText(/仪表盘|Dashboard/)
})
