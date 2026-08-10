import { expect } from '@playwright/test';
import { test, mockLogin as login } from '@nop-chaos/e2e-shared';

const MODE = process.env.PLAYWRIGHT_APP_MODE ?? '';
const isFlux = MODE === 'flux-prototype';

test.describe('flux index column pagination offset', () => {
  test.skip(() => !isFlux, 'Flux-only check');

  test('sequence numbers continue across pages (page 1: 1-10, page 2: 11-15)', async ({ page }) => {
    await login(page, { username: 'proto', mockMenuRoutes: false });
    const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();
    await nav.getByRole('button', { name: '系统管理' }).click();
    await expect(nav.getByRole('button', { name: '产品管理' })).toBeVisible({ timeout: 10_000 });
    await nav.getByRole('button', { name: '产品管理' }).click();
    await expect(page.getByText('无线蓝牙耳机')).toBeVisible({ timeout: 20_000 });

    // Page 1: first index cell should be "1", 10 rows visible
    const indexCells = page.locator(
      "[data-slot='crud-table'] .nop-table tbody td[data-slot='table-index-cell']",
    );
    await expect(indexCells.first()).toHaveText('1', { timeout: 10_000 });
    await expect(indexCells).toHaveCount(10);
    await expect(indexCells.nth(9)).toHaveText('10');

    // Go to page 2 via the built-in table pagination bar (next button)
    const nextButton = page
      .locator(
        "[data-slot='table-pagination'] [aria-label='下一页'], [data-slot='table-pagination'] [aria-label='Next page']",
      )
      .first();
    await nextButton.click();
    await expect(indexCells.first()).toHaveText('11', { timeout: 10_000 });
    await expect(indexCells).toHaveCount(5);
    await expect(indexCells.nth(4)).toHaveText('15');
  });

  test('checkbox column exists and is centered', async ({ page }) => {
    await login(page, { username: 'proto', mockMenuRoutes: false });
    const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();
    await nav.getByRole('button', { name: '系统管理' }).click();
    await expect(nav.getByRole('button', { name: '产品管理' })).toBeVisible({ timeout: 10_000 });
    await nav.getByRole('button', { name: '产品管理' }).click();
    await expect(page.getByText('无线蓝牙耳机')).toBeVisible({ timeout: 20_000 });

    const header = page
      .locator("[data-slot='crud-table'] .nop-table thead [data-slot='table-select-column']")
      .first();
    await expect(header).toBeVisible();

    const cell = page
      .locator("[data-slot='crud-table'] .nop-table tbody [data-slot='table-select-cell']")
      .first();
    await expect(cell).toBeVisible();

    const centered = await header.evaluate((el) => {
      const cs = getComputedStyle(el);
      const cb = el.querySelector('[data-slot="checkbox"]') as HTMLElement | null;
      return {
        thTextAlign: cs.textAlign,
        checkboxRect: cb ? cb.getBoundingClientRect() : null,
        thRect: el.getBoundingClientRect(),
      };
    });
    console.log('[flux-index] selection header center check =', JSON.stringify(centered));
    expect(centered.thTextAlign).toBe('center');
    if (centered.checkboxRect && centered.thRect) {
      const offset = Math.abs(
        centered.checkboxRect.left +
          centered.checkboxRect.width / 2 -
          (centered.thRect.left + centered.thRect.width / 2),
      );
      console.log('[flux-index] checkbox center offset (px) =', Math.round(offset));
      expect(offset).toBeLessThan(4);
    }

    // Header checkbox and body checkbox must be horizontally aligned with each other.
    const bodyCheckbox = cell.locator('[data-slot="checkbox"]');
    const alignment = await header.evaluate(
      (th, td) => {
        const thCb = th.querySelector('[data-slot="checkbox"]') as HTMLElement | null;
        const tdCb = td?.querySelector('[data-slot="checkbox"]') as HTMLElement | null;
        if (!thCb || !tdCb) return null;
        const tb = thCb.getBoundingClientRect();
        const db = tdCb.getBoundingClientRect();
        return {
          headerCenterX: (tb.left + tb.right) / 2,
          bodyCenterX: (db.left + db.right) / 2,
          delta: Math.abs((tb.left + tb.right) / 2 - (db.left + db.right) / 2),
        };
      },
      await cell.elementHandle(),
    );
    console.log('[flux-index] header-vs-body checkbox alignment =', JSON.stringify(alignment));
    if (alignment) {
      expect(alignment.delta).toBeLessThan(1);
    }
  });

  test('built-in pagination bar is present by default with left-middle-right layout', async ({
    page,
  }) => {
    await login(page, { username: 'proto', mockMenuRoutes: false });
    const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();
    await nav.getByRole('button', { name: '系统管理' }).click();
    await expect(nav.getByRole('button', { name: '产品管理' })).toBeVisible({ timeout: 10_000 });
    await nav.getByRole('button', { name: '产品管理' }).click();
    await expect(page.getByText('无线蓝牙耳机')).toBeVisible({ timeout: 20_000 });

    // Built-in bar exists WITHOUT any footerToolbar/toolbarLayout configuration
    const bar = page.locator("[data-slot='table-pagination']");
    await expect(bar).toBeVisible({ timeout: 10_000 });
    const info = await bar.evaluate((el) => {
      const cs = getComputedStyle(el);
      // Left: page-size select; Middle: pagination list; Right: range summary
      // (zh: "第 1-10 条，共 15 条"; en: "1-10 of 15")
      const items = Array.from(el.querySelectorAll('*')).filter((n) => {
        const t = (n.textContent ?? '').trim();
        return (
          (/条，共\s*\d+\s*条$/.test(t) || /of\s*\d+$/.test(t)) &&
          (n as HTMLElement).tagName !== 'SPAN'
        );
      });
      const pageLinks = el.querySelectorAll('[data-slot="pagination-link"]');
      return {
        display: cs.display,
        justifyContent: cs.justifyContent,
        pageLinks: Array.from(pageLinks).map((a) => a.textContent?.trim()),
        summaryText: items[0] ? items[0].textContent?.trim() : null,
      };
    });
    console.log('[flux-index] builtin bar =', JSON.stringify(info));
    expect(info.display).toBe('flex');
    expect(info.justifyContent).toBe('space-between');
    expect(info.pageLinks).toContain('1');
    expect(info.pageLinks).toContain('2');
    expect(info.summaryText).toMatch(/1-10 条，共 15 条/);
  });
});
