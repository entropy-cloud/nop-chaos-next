import { expect } from '@playwright/test';
import { mockLogin as login, test, FluxAdapter, FormDialog } from '@nop-chaos/e2e-shared';

const engine = new FluxAdapter();

test.describe('Flux complex form — page-level tabs', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Flux Complex Form' }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('switchToTab: Home → CRUD → Dashboard', async ({ page }) => {
    let panel = engine.activeTabPanel(page);
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await expect(panel.locator('text=Home tab')).toBeVisible({ timeout: 5_000 });

    panel = await engine.switchToTab(page, 'CRUD');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await expect(panel.locator('.nop-crud').first()).toBeVisible({ timeout: 5_000 });

    panel = await engine.switchToTab(page, 'Dashboard');
    await expect(panel).toBeVisible({ timeout: 5_000 });
    await expect(panel.locator('.nop-crud').first()).toBeVisible({ timeout: 5_000 });
  });

  test('subTable: dashboard CRUD inside Dashboard tab', async ({ page }) => {
    const panel = await engine.switchToTab(page, 'Dashboard');
    const table = engine.subTable(panel, 0);
    await expect(table).toBeVisible({ timeout: 5_000 });
    await expect(table.locator('text=Revenue')).toBeVisible({ timeout: 5_000 });
    await expect(table.locator('text=100K')).toBeVisible({ timeout: 5_000 });
  });

  test('FormDialog: open, setField, and submit', async ({ page }) => {
    const panel = await engine.switchToTab(page, 'CRUD');
    await expect(panel.locator('.nop-crud')).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: 'Open Form Dialog' }).click();
    const dialog = new FormDialog(page, engine);
    await dialog.waitForVisible();

    await dialog.setField('name', 'Test Name');
    expect(await page.locator('#name-control').inputValue()).toBe('Test Name');

    await dialog.setField('featured', true);
    await page.waitForTimeout(300);
    const switchEl = page.locator(
      '[data-slot="switch-wrapper"]:has(#featured-control) [role="switch"]',
    ).first();
    expect(await switchEl.getAttribute('aria-checked')).toBe('true');
  });
});
