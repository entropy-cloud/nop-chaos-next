import { expect, test } from '@playwright/test'
import { login } from './support/auth'

test('master detail list opens detail in tab and warns on unsaved leave', async ({ page }) => {
  await login(page, { username: 'admin', defaultPassword: '123456' })

  await page.goto('/#/data-management/master-detail')
  const targetRow = page.getByRole('row').filter({ hasText: /SO-202603-1001/ })
  await targetRow.click()
  await expect(page).toHaveURL(/\/data-management\/master-detail\//)
  await expect(page.getByText('Core record information')).toBeVisible()
  await expect(page.getByRole('button', { name: /SO-202603-/ }).first()).toBeVisible()

  await page.getByText('Order items').click()
  await page.locator('tbody input').first().fill('已修改商品')

  const dialogPromise = new Promise<string>((resolve) => {
    page.once('dialog', async (dialog) => {
      const message = dialog.message()
      await dialog.dismiss()
      resolve(message)
    })
  })
  await page.getByRole('button', { name: 'Back to list' }).click()
  await expect.poll(async () => dialogPromise).toContain('unsaved')
  await expect(page).toHaveURL(/\/data-management\/master-detail\//)
})
