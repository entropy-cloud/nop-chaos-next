import { expect } from '@playwright/test';
import { test, mockLogin as login } from '@nop-chaos/e2e-shared';

const MODE = process.env.PLAYWRIGHT_APP_MODE ?? '';
const isFlux = MODE === 'flux-prototype';
const isAmis = MODE === 'amis-prototype';

test.describe('flux/amis CRUD visual diagnostic', () => {
  test.skip(
    () => !isFlux && !isAmis,
    'Requires PLAYWRIGHT_APP_MODE=amis-prototype or PLAYWRIGHT_APP_MODE=flux-prototype',
  );

  test('inspect header bg / borders / pagination padding / checkbox alignment', async ({ page }) => {
    await login(page, { username: 'proto', mockMenuRoutes: false });
    const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();
    await nav.getByRole('button', { name: '系统管理' }).click();
    await expect(nav.getByRole('button', { name: '产品管理' })).toBeVisible({ timeout: 10_000 });
    await nav.getByRole('button', { name: '产品管理' }).click();
    await expect(page.getByText('无线蓝牙耳机')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(1500);

    const data = await page.evaluate((mode) => {
      const isFlux = mode === 'flux-prototype';
      const out: Record<string, unknown> = {};

      const thSel = isFlux
        ? "[data-slot='crud-table'] .nop-table thead th"
        : 'main table thead th';
      const th = document.querySelector(thSel) as HTMLElement | null;
      if (th) {
        const cs = getComputedStyle(th);
        out.thead_th_bg = cs.backgroundColor;
        out.thead_th_border = cs.border;
        out.thead_th_borderBottom = cs.borderBottom;
        out.thead_th_text = th.textContent?.trim();
        out.thead_th_textAlign = cs.textAlign;
      }

      const wrapperSel = isFlux ? '.nop-crud' : '.cxd-Crud';
      const crudWrapper = document.querySelector(wrapperSel) as HTMLElement | null;
      if (crudWrapper) {
        const cs = getComputedStyle(crudWrapper);
        out.crudWrapper = {
          border: cs.border,
          background: cs.backgroundColor,
          padding: cs.padding,
        };
      }

      const firstRowSel = isFlux
        ? "[data-slot='crud-table'] .nop-table tbody tr[data-slot='table-row']"
        : 'main table tbody tr';
      const firstRow = document.querySelector(firstRowSel) as HTMLElement | null;
      if (firstRow) {
        const cells = Array.from(firstRow.querySelectorAll('td'));
        out.firstRow_cellCount = cells.length;
        out.firstRow_cells = cells.slice(0, 3).map((c) => {
          const cs = getComputedStyle(c);
          return {
            text: c.textContent?.trim().slice(0, 30),
            borderLeft: cs.borderLeft,
            borderRight: cs.borderRight,
            borderTop: cs.borderTop,
            borderBottom: cs.borderBottom,
            textAlign: cs.textAlign,
          };
        });
      }

      // Footer / pagination alignment
      const footerSel = isFlux
        ? "[data-slot='crud-footer']"
        : '.cxd-Crud-footToolbar, .cxd-Crud-toolbar';
      const footer = document.querySelector(footerSel) as HTMLElement | null;
      const tableSel = isFlux ? "[data-slot='crud-table'] .nop-table" : 'main table:has(tbody tr)';
      const tableEl = document.querySelector(tableSel) as HTMLElement | null;
      if (footer && tableEl) {
        const fcs = getComputedStyle(footer);
        const fr = footer.getBoundingClientRect();
        const tr = tableEl.getBoundingClientRect();
        out.footer_vs_table = {
          footerPadding: fcs.padding,
          footerPaddingLeft: fcs.paddingLeft,
          footerPaddingRight: fcs.paddingRight,
          footerJustifyContent: fcs.justifyContent,
          footerDisplay: fcs.display,
          tableLeft: Math.round(tr.left),
          tableRight: Math.round(tr.right),
          footerLeft: Math.round(fr.left),
          footerRight: Math.round(fr.right),
          gap_tableBottom_to_footerTop: Math.round(fr.top - tr.bottom),
        };
      }

      const allHeaders = Array.from(
        document.querySelectorAll(isFlux ? thSel : 'main table thead th'),
      ).map((h) => h.textContent?.trim());
      out.allColumnHeaders = allHeaders;

      return out;
    }, MODE);

    console.log(`\n========== [${MODE}] visual diagnostic ==========`);
    console.log(JSON.stringify(data, null, 2));
    expect(data).toBeTruthy();
  });
});
