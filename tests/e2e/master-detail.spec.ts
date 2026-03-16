import { expect, test } from '@playwright/test'

test('master detail list opens detail in tab and warns on unsaved leave', async ({ page }) => {
  await page.goto('/')
  await page.locator('input').first().fill('admin')
  await page.locator('input[type="password"]').fill('123456')
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/dashboard$/)

  await page.goto('/data-management/master-detail')
  await page.getByRole('button', { name: '查看' }).first().click()
  await expect(page).toHaveURL(/\/data-management\/master-detail\//)
  await expect(page.getByText('主表核心信息')).toBeVisible()
  await expect(page.getByRole('button', { name: /SO-202603-/ }).first()).toBeVisible()

  await page.getByText('订单明细').click()
  await page.locator('tbody input').first().fill('已修改商品')

  const dialogPromise = new Promise<string>((resolve) => {
    page.once('dialog', async (dialog) => {
      const message = dialog.message()
      await dialog.dismiss()
      resolve(message)
    })
  })
  await page.getByRole('button', { name: '返回列表' }).click()
  await expect.poll(async () => dialogPromise).toContain('未保存')
  await expect(page).toHaveURL(/\/data-management\/master-detail\//)
})
