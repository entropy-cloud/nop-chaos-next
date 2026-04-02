import { expect, test } from '@playwright/test'
import { login } from './support/auth'

function sidebarTrigger(page: import('@playwright/test').Page) {
  return page.locator('aside [data-testid="sidebar-user-menu-trigger"]')
}

test('sidebar user menu opens, shows user info, and navigates to settings', async ({ page }) => {
  await login(page)
  await expect(page.locator('aside')).toContainText(/Dashboard/i)
  await sidebarTrigger(page).click()
  const menuContent = page.locator('[data-slot="dropdown-menu-content"]')
  await expect(menuContent).toBeVisible()
  await expect(menuContent.locator('[data-slot="dropdown-menu-label"]')).toBeVisible()
  const settingsItem = page.locator('[data-testid="sidebar-user-menu-settings"]')
  await expect(settingsItem).toBeVisible()
  await settingsItem.click()
  await expect(page).toHaveURL(/\/settings$/)
})

test('sidebar user menu navigates to theme settings', async ({ page }) => {
  await login(page)
  await sidebarTrigger(page).click()
  const menuContent = page.locator('[data-slot="dropdown-menu-content"]')
  await expect(menuContent).toBeVisible()
  await page.locator('[data-testid="sidebar-user-menu-theme"]').click()
  await expect(page).toHaveURL(/\/settings\/theme$/)
})

test('sidebar user menu navigates to language settings', async ({ page }) => {
  await login(page)
  await sidebarTrigger(page).click()
  const menuContent = page.locator('[data-slot="dropdown-menu-content"]')
  await expect(menuContent).toBeVisible()
  await page.locator('[data-testid="sidebar-user-menu-language"]').click()
  await expect(page).toHaveURL(/\/settings\/language$/)
})

test('sidebar user menu logout clears session and redirects to login', async ({ page }) => {
  await login(page)
  await expect(page.locator('aside')).toContainText(/Dashboard/i)
  await sidebarTrigger(page).click()
  const menuContent = page.locator('[data-slot="dropdown-menu-content"]')
  await expect(menuContent).toBeVisible()
  page.on('dialog', dialog => dialog.accept())
  await page.locator('[data-testid="sidebar-user-menu-logout"]').click()
  await expect(page).toHaveURL(/#\/auth\/login$/)
})
