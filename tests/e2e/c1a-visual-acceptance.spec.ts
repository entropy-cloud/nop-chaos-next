import { expect } from '@playwright/test';
import { test } from '@nop-chaos/e2e-shared';
import { mockLogin as login } from '@nop-chaos/e2e-shared';

async function readStyles(
  locator: import('@playwright/test').Locator,
  props: string[],
): Promise<Record<string, string>> {
  return locator.evaluate((node, names) => {
    const style = getComputedStyle(node as Element);
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name)]));
  }, props);
}

function num(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : -1;
}

async function waitForWidth(
  locator: import('@playwright/test').Locator,
  expected: number,
): Promise<void> {
  await expect
    .poll(async () => {
      const box = await locator.boundingBox();
      return box ? Math.round(box.width) : -1;
    })
    .toBe(expected);
}

async function waitForTop(
  locator: import('@playwright/test').Locator,
  expected: number,
): Promise<void> {
  await expect
    .poll(async () => {
      const box = await locator.boundingBox();
      return box ? Math.round(box.y) : -1;
    })
    .toBe(expected);
}

/**
 * C1a host acceptance (nop-chaos-next-master): programmatic parity evidence
 * between the AMIS-rendered baseline (Amis Preview page, amis 6.13.1 bridged
 * theme) and the flux-rendered pages, plus a smoke pass over the host's direct
 * @nop-chaos/ui Table/DialogContent consumers.
 *
 * AMIS live reference values (measured 2026-08-09, Desktop Chrome 1280x720):
 *   thead th: 14px / height 44px / padding 11px 10px 11px 12px
 *   body td:  12px / height 47px / padding 11px 10px 11px 16px (16px edge-left)
 *   body row: 47px
 *   modal (normal): width 500px, top 60px; host bridged overlay 0.4
 *     (amis-fix.css .cxd-Modal-overlay background: var(--surface-overlay));
 *     raw AMIS default.css overlay is 0.7 (see C1a plan baseline).
 */
test.describe('C1a host AMIS parity acceptance (flux vs amis same-page comparison)', () => {
  test('AMIS baseline table density (reference values for parity)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('nop-language:v1', 'en-US'));
    await login(page, { mockMenuRoutes: false });
    await page.getByRole('button', { name: 'Amis Preview' }).click();
    await expect(page).toHaveURL(/\/amis\/preview$/);

    const bodyTable = page.locator('main table:has(tbody tr)').first();
    const firstRow = bodyTable.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    const headerTable = page.locator('main table').first();

    const headStyle = await readStyles(headerTable.locator('th').first(), ['font-size', 'height']);
    const cellStyle = await readStyles(bodyTable.locator('tbody td').first(), [
      'font-size',
      'padding-top',
      'padding-bottom',
      'padding-left',
    ]);
    const rowBox = await firstRow.boundingBox();

    expect(headStyle['font-size']).toBe('14px');
    expect(headStyle.height).toBe('44px');
    expect(cellStyle['font-size']).toBe('12px');
    expect(num(cellStyle['padding-top'])).toBeGreaterThanOrEqual(10);
    expect(num(cellStyle['padding-top'])).toBeLessThanOrEqual(13);
    expect(cellStyle['padding-bottom']).toBe(cellStyle['padding-top']);
    expect(num(cellStyle['padding-left'])).toBeGreaterThanOrEqual(14);
    expect(rowBox!.height).toBeGreaterThanOrEqual(40);
  });

  test('AMIS baseline dialog values (View dialog on Amis Preview)', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('nop-language:v1', 'en-US'));
    await login(page, { mockMenuRoutes: false });
    await page.getByRole('button', { name: 'Amis Preview' }).click();
    await expect(page).toHaveURL(/\/amis\/preview$/);

    const bodyTable = page.locator('main table:has(tbody tr)').first();
    await expect(bodyTable.locator('tbody tr').first()).toBeVisible();
    await bodyTable.getByRole('button', { name: 'View' }).first().click();

    const modal = page.locator('.cxd-Modal').last();
    await expect(modal).toBeVisible();
    const content = modal.locator('.cxd-Modal-content').first();
    await expect(content).toBeVisible();

    await waitForWidth(content, 500);
    await waitForTop(content, 60);

    const overlay = page.locator('.cxd-Modal-overlay').last();
    const overlayStyle = await readStyles(overlay, ['background-color']);
    expect(overlayStyle['background-color']).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('flux CRUD table density matches AMIS baseline (12/14px, 44px thead, 10/11px padding, 16px edge)', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('nop-language:v1', 'en-US'));
    await login(page, { mockMenuRoutes: false });
    await page.getByRole('button', { name: 'Flux Demo' }).click();
    await expect(page.getByText('Flux JSON CRUD Demo')).toBeVisible({ timeout: 15_000 });

    const table = page.locator('[data-slot="crud-table"] .nop-table').first();
    await expect(table.locator('tbody tr').first()).toBeVisible();

    const headStyle = await readStyles(table.locator('thead th').first(), ['font-size', 'height']);
    const firstCell = table.locator('tbody td').first();
    const cellStyle = await readStyles(firstCell, [
      'font-size',
      'padding-top',
      'padding-bottom',
      'padding-left',
    ]);
    const lastCellStyle = await readStyles(table.locator('tbody td').last(), ['padding-right']);

    expect(headStyle['font-size']).toBe('14px');
    expect(headStyle.height).toBe('44px');
    expect(cellStyle['font-size']).toBe('12px');
    expect(cellStyle['padding-top']).toBe('11px');
    expect(cellStyle['padding-bottom']).toBe('11px');
    expect(cellStyle['padding-left']).toBe('16px');
    expect(lastCellStyle['padding-right']).toBe('16px');
  });

  test('flux CRUD row hover + action button height on host page', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('nop-language:v1', 'en-US'));
    await login(page, { mockMenuRoutes: false });
    await page.getByRole('button', { name: 'Flux Demo' }).click();
    await expect(page.getByText('Flux JSON CRUD Demo')).toBeVisible({ timeout: 15_000 });

    const table = page.locator('[data-slot="crud-table"] .nop-table').first();
    const firstRow = table.locator('tbody tr[data-slot="table-row"]').first();
    await expect(firstRow).toBeVisible();

    const bgBefore = await readStyles(firstRow, ['background-color']);
    expect(bgBefore['background-color']).toBe('rgba(0, 0, 0, 0)');

    await firstRow.hover();
    await expect
      .poll(async () => (await readStyles(firstRow, ['background-color']))['background-color'])
      .not.toBe('rgba(0, 0, 0, 0)');

    const fixedStyle = await readStyles(table.locator('tbody td').first(), ['background-color']);
    expect(fixedStyle['background-color']).toBe('rgba(0, 0, 0, 0)');

    const actionButton = table.locator("[data-slot='table-actions'] button").first();
    await expect(actionButton).toBeVisible();
    const actionStyle = await readStyles(actionButton, ['height']);
    // AMIS parity: link-style action button ~24px (was 32px which inflated rows)
    expect(actionStyle.height).toBe('24px');
  });

  test('flux dialog parity on host page (500px, top 60px, overlay 0.7, title 14px)', async ({
    page,
  }) => {
    await page.addInitScript(() => localStorage.setItem('nop-language:v1', 'en-US'));
    await login(page, { mockMenuRoutes: false });
    await page.getByRole('button', { name: 'Flux Demo' }).click();
    await expect(page.getByText('Flux JSON CRUD Demo')).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Open create form' }).click();
    const surface = page.locator('[data-slot="dialog-surface"]').last();
    await expect(surface).toBeVisible();

    await waitForWidth(surface, 500);
    await waitForTop(surface, 60);

    const overlay = page.locator('[data-slot="dialog-overlay"]').last();
    await expect(overlay).toBeVisible();
    const overlayStyle = await readStyles(overlay, ['background-color']);
    expect(overlayStyle['background-color']).toBe('rgba(0, 0, 0, 0.7)');

    const titleStyle = await readStyles(surface.locator('[data-slot="dialog-title"]'), ['font-size']);
    // AMIS parity: Modal title 14px (cxd default)
    expect(titleStyle['font-size']).toBe('14px');
  });

  test('ui primitives direct-consumption smoke (master-detail Table + AddressDialog, plugins DialogContent, flow-editor list)', async ({
    page,
  }) => {
    await login(page, { username: 'admin', defaultPassword: '123456' });

    await page.getByRole('button', { name: 'Master Detail' }).click();
    const masterTable = page.locator('main table tbody tr').first();
    await expect(masterTable).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /View|查看/ }).first().click();
    await expect(page).toHaveURL(/\/data-management\/master-detail\/1001$/);
    const itemsTable = page.locator('main table').first();
    await expect(itemsTable.locator('tbody tr').first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: /Add Address|新增地址/i }).click();
    const addressDialog = page.locator('[data-slot="dialog-content"]');
    await expect(addressDialog).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /Plugin Management|插件管理/i }).click();
    await expect(page).toHaveURL(/\/plugins\/management$/);
    await expect(page.locator('main')).toBeVisible();
    const pluginsDialogOpener = page
      .locator('main')
      .getByRole('button', { name: /New Plugin|新建/i })
      .first();
    if (await pluginsDialogOpener.isVisible().catch(() => false)) {
      await pluginsDialogOpener.click();
      await expect(page.locator('[data-slot="dialog-content"]').first()).toBeVisible();
      await page.keyboard.press('Escape');
    }

    await page.getByRole('button', { name: /Flow Library|流程列表/i }).first().click();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('main table, main [role="grid"], main ul').first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
