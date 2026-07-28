import { expect } from '@playwright/test';
import { test, mockLogin as login, waitForSidebar } from '@nop-chaos/e2e-shared';

function sidebarTrigger(page: import('@playwright/test').Page) {
  return page.locator('aside [data-testid="sidebar-user-menu-trigger"]');
}

function confirmDialog(page: import('@playwright/test').Page) {
  return page.locator('[role="alertdialog"]');
}

test('sidebar user menu opens, shows user info, and navigates to settings', async ({ page }) => {
  await login(page);
  await waitForSidebar(page);
  await sidebarTrigger(page).click();
  const menuContent = page.locator('[data-slot="dropdown-menu-content"]');
  await expect(menuContent).toBeVisible();
  await expect(menuContent.locator('[data-slot="dropdown-menu-label"]')).toBeVisible();
  const settingsItem = page.locator('[data-testid="sidebar-user-menu-settings"]');
  await expect(settingsItem).toBeVisible();
  await settingsItem.click();
  await expect(page).toHaveURL(/\/settings$/);
});

test('sidebar user menu navigates to theme settings', async ({ page }) => {
  await login(page);
  await sidebarTrigger(page).click();
  const menuContent = page.locator('[data-slot="dropdown-menu-content"]');
  await expect(menuContent).toBeVisible();
  await page.locator('[data-testid="sidebar-user-menu-settings-theme"]').click();
  await expect(page).toHaveURL(/\/settings\/theme$/);
});

test('sidebar user menu navigates to language settings', async ({ page }) => {
  await login(page);
  await sidebarTrigger(page).click();
  const menuContent = page.locator('[data-slot="dropdown-menu-content"]');
  await expect(menuContent).toBeVisible();
  await page.locator('[data-testid="sidebar-user-menu-settings-language"]').click();
  await expect(page).toHaveURL(/\/settings\/language$/);
});

test('sidebar user menu logout clears session and redirects to login', async ({ page }) => {
  await login(page);
  await waitForSidebar(page);
  await sidebarTrigger(page).click();
  const menuContent = page.locator('[data-slot="dropdown-menu-content"]');
  await expect(menuContent).toBeVisible();
  await page.locator('[data-testid="sidebar-user-menu-logout"]').click();
  await expect(confirmDialog(page)).toBeVisible();
  await confirmDialog(page).getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/#\/auth\/login$/);
});
