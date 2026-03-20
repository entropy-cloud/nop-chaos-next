import { expect, test } from '@playwright/test'

test('extension demo alias mode loads Harbor login and builtin page', async ({ page }) => {
  await page.goto('/#/auth/login')

  await expect(page.getByText('Harbor Operations Suite')).toBeVisible()
  await expect(page.getByText('Harbor Sign-in')).toBeVisible()

  await page.getByLabel('Username').fill('harbor')
  await page.getByLabel('Password').fill('123456')
  await page.getByRole('button', { name: /Enter Harbor/i }).click()

  await expect(page).toHaveURL(/#\/dashboard$/)
  await page.goto('/#/examples/extension-harbor')
  await expect(page.getByText('Extension Builtin Page')).toBeVisible()
  await expect(page.getByText('Tailwind shared with the host shell')).toBeVisible()
  await expect(page.locator('aside')).toContainText('Extension Harbor Page')
})
