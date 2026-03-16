import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/')
  await page.locator('input').first().fill('admin')
  await page.locator('input[type="password"]').fill('123456')
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test('plugin demo reuses host navigation and shared shell context', async ({ page }) => {
  await login(page)

  await page.goto('/plugins/demo')
  await expect(page).toHaveURL(/\/plugins\/demo$/)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('main')).not.toContainText('p[1] is not a function')
  await expect(page.getByText('Plugin operations lens')).toBeVisible()
  await expect(page.getByText(/route \/plugins\/demo|路由 \/plugins\/demo/)).toBeVisible()
  await expect(page.getByText(/Custom analytics|自定义分析/)).toBeVisible()

  const chart = page.locator('[data-testid="plugin-analytics-chart"]')
  await expect(chart).toBeVisible()

  await page.getByRole('button', { name: /插件管理|Plugin management/ }).click()

  await expect(page).toHaveURL(/\/plugins\/management$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/插件管理|Plugin management/)
})
