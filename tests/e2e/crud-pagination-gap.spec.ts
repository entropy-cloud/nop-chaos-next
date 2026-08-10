import { expect } from '@playwright/test';
import { test, mockLogin as login } from '@nop-chaos/e2e-shared';

const MODE = process.env.PLAYWRIGHT_APP_MODE ?? '';
const isFlux = MODE === 'flux-prototype';
const isAmis = MODE === 'amis-prototype';

test.describe('table ↔ pagination gap measurement', () => {
  test.skip(
    () => !isFlux && !isAmis,
    'Requires PLAYWRIGHT_APP_MODE=amis-prototype or PLAYWRIGHT_APP_MODE=flux-prototype',
  );

  test('measure gap between last table row and pagination', async ({ page }) => {
    await login(page, { username: 'proto', mockMenuRoutes: false });
    const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();
    await nav.getByRole('button', { name: '系统管理' }).click();
    await expect(nav.getByRole('button', { name: '产品管理' })).toBeVisible({ timeout: 10_000 });
    await nav.getByRole('button', { name: '产品管理' }).click();
    await expect(page.getByText('无线蓝牙耳机')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(800);

    const data = await page.evaluate((mode) => {
      const isFlux = mode === 'flux-prototype';
      const out: Record<string, unknown> = {};

      const lastRowSel = isFlux
        ? "[data-slot='crud-table'] .nop-table tbody tr[data-slot='table-row']:last-child"
        : 'main table tbody tr:last-child';
      const lastRow = document.querySelector(lastRowSel);
      if (lastRow) {
        const r = lastRow.getBoundingClientRect();
        out.lastRow = {
          bottom: Math.round(r.bottom),
          top: Math.round(r.top),
          height: Math.round(r.height),
        };
      }

      // AMIS splits thead/tbody into separate tables when sticky; the body
      // table is the one containing a <tbody> with rows.
      const tableSel = isFlux
        ? "[data-slot='crud-table'] .nop-table"
        : 'main table:has(tbody tr)';
      const tableEl = document.querySelector(tableSel);
      if (tableEl) {
        const r = tableEl.getBoundingClientRect();
        out.table = {
          bottom: Math.round(r.bottom),
          top: Math.round(r.top),
          height: Math.round(r.height),
        };
        const cs = getComputedStyle(tableEl);
        out.tableStyle = { marginBottom: cs.marginBottom, paddingBottom: cs.paddingBottom };
      }

      // AMIS wraps pagination in .cxd-Crud-footToolbar; flux uses
      // [data-slot='crud-footer'].
      const pagWrapperSel = isFlux
        ? "[data-slot='crud-footer']"
        : '.cxd-Crud-footToolbar, .cxd-Crud-toolbar';
      const pagWrapper = document.querySelector(pagWrapperSel);
      if (pagWrapper) {
        const r = pagWrapper.getBoundingClientRect();
        out.paginationWrapper = {
          bottom: Math.round(r.bottom),
          top: Math.round(r.top),
          height: Math.round(r.height),
        };
        const cs = getComputedStyle(pagWrapper);
        out.paginationWrapperStyle = {
          marginTop: cs.marginTop,
          paddingTop: cs.paddingTop,
          padding: cs.padding,
          display: cs.display,
          justifyContent: cs.justifyContent,
        };
      }

      // Inner pagination element (actual page buttons).
      const pagInnerSel = isFlux
        ? "[data-slot='pagination'], [data-slot='pagination-item']"
        : '.cxd-Pagination';
      const pagInner = document.querySelector(pagInnerSel);
      if (pagInner) {
        const r = pagInner.getBoundingClientRect();
        out.paginationInner = {
          bottom: Math.round(r.bottom),
          top: Math.round(r.top),
          height: Math.round(r.height),
        };
      }

      if (out.lastRow && out.paginationWrapper) {
        out.GAP_LASTROW_TO_PAGINATION_WRAPPER = Math.round(
          (out.paginationWrapper as { top: number }).top -
            (out.lastRow as { bottom: number }).bottom,
        );
      }
      if (out.table && out.paginationWrapper) {
        out.GAP_TABLE_TO_PAGINATION_WRAPPER = Math.round(
          (out.paginationWrapper as { top: number }).top -
            (out.table as { bottom: number }).bottom,
        );
      }
      return out;
    }, MODE);

    console.log(`\n========== [${MODE}] table↔pagination gap ==========`);
    console.log(JSON.stringify(data, null, 2));

    // Persist for cross-engine comparison.
    expect(data).toBeTruthy();
  });
});
