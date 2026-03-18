import { expect, test } from '@playwright/test'

test('real amis demo page renders and exposes report actions', async ({ page }) => {
  await page.goto('/')

  await page.locator('input').first().fill('nop')
  await page.locator('input[type="password"]').fill('123')
  await page.locator('button[type="submit"]').click()

  await expect(page).toHaveURL(/\/report\/demo\/pages\/demo$/)
  await expect(page.locator('.cxd-Page')).toBeVisible()
  await expect(page.getByText('报表示例')).toBeVisible()
  await expect(page.getByRole('button', { name: '导出Excel' })).toBeVisible()
  await expect(page.getByRole('button', { name: '更新显示' })).toBeVisible()
})
