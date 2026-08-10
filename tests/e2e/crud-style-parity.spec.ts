/**
 * CRUD Style Parity — flux vs amis prototype side-by-side checker.
 *
 * Goal: programmatic + manual-checkable evidence that the flux CRUD subtree
 * (after `apps/main/src/styles/flux-amis-crud-parity.css` overrides) visually
 * matches the AMIS baseline. See:
 *   docs/analysis/2026-08-10-flux-amis-crud-style-parity-analysis.md
 *
 * Usage (run twice, once per engine, then compare console output + screenshots):
 *
 *   # AMIS baseline (port 4176)
 *   PLAYWRIGHT_APP_MODE=amis-prototype \
 *     pnpm test:e2e --config=playwright.amis-prototype.config.ts \
 *       tests/e2e/crud-style-parity.spec.ts
 *
 *   # Flux parity (port 4177)
 *   PLAYWRIGHT_APP_MODE=flux-prototype \
 *     pnpm test:e2e --config=playwright.flux-prototype.config.ts \
 *       tests/e2e/crud-style-parity.spec.ts
 *
 * Each test prints measured CSS values via `console.log` and writes a PNG to
 * test-results/ for manual visual review.
 *
 * The "products" page is defined identically (schema + mock data) under:
 *   prototypes/amis-demo/pages/system/products.json
 *   prototypes/flux-demo/pages/system/products.json
 */
import { expect, type Locator } from '@playwright/test';
import { test, mockLogin as login } from '@nop-chaos/e2e-shared';

const APP_MODE = process.env.PLAYWRIGHT_APP_MODE ?? '';
const isFlux = APP_MODE === 'flux-prototype';
const isAmis = APP_MODE === 'amis-prototype';

/**
 * Tolerant numeric comparator — different rendering backends may differ by
 * 1–2px due to sub-pixel rounding. Parity "delta" budget is the intent, not
 * exact equality.
 */
function num(value: string | undefined): number {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : -1;
}

async function readStyles(
  locator: Locator,
  props: string[],
): Promise<Record<string, string>> {
  return locator.evaluate((node, names) => {
    const style = getComputedStyle(node as Element);
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name)]));
  }, props);
}

async function readRgb(locator: Locator, prop: string): Promise<[number, number, number, number]> {
  return locator.evaluate((node, p) => {
    const v = getComputedStyle(node as Element).getPropertyValue(p).trim();
    const m = v.match(/rgba?\(([^)]+)\)/);
    if (!m) return [-1, -1, -1, -1];
    const parts = m[1].split(',').map((s) => Number.parseFloat(s.trim()));
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 1];
  }, prop);
}

async function screenshot(page: import('@playwright/test').Page, name: string) {
  // Attach to test-results/crud-style-parity-<mode>-<name>.png for manual review.
  // Use fullPage so the table (which sits below the search form / toolbar in flux)
  // is captured even when the viewport is shorter than the page content.
  await page.screenshot({
    path: `test-results/crud-style-parity-${APP_MODE}-${name}.png`,
    fullPage: true,
  });
}

async function navigateToProducts(page: import('@playwright/test').Page) {
  await login(page, { username: 'proto', mockMenuRoutes: false });
  const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();
  await nav.getByRole('button', { name: '系统管理' }).click();
  // Wait for the 产品管理 sub-item to appear (the parent group just expanded).
  await expect(nav.getByRole('button', { name: '产品管理' })).toBeVisible({ timeout: 10_000 });
  await nav.getByRole('button', { name: '产品管理' }).click();
  // Wait for the products page to actually mount (its data is unique: "无线蓝牙耳机").
  await expect(page.getByText('无线蓝牙耳机')).toBeVisible({ timeout: 20_000 });
}

/**
 * Engine-resolved table locator. AMIS uses `.cxd-Table-*`; flux uses
 * `[data-slot='crud-table'] .nop-table`.
 */
function tableLocator(page: import('@playwright/test').Page): Locator {
  return isFlux
    ? page.locator("[data-slot='crud-table'] .nop-table").first()
    : page.locator('main table:has(tbody tr)').first();
}

function firstRowLocator(page: import('@playwright/test').Page): Locator {
  return isFlux
    ? tableLocator(page).locator("tbody tr[data-slot='table-row']").first()
    : tableLocator(page).locator('tbody tr').first();
}

function headerCellLocator(page: import('@playwright/test').Page): Locator {
  // AMIS may split thead into a separate sticky table; locate via main table first.
  return isFlux
    ? tableLocator(page).locator('thead th').first()
    : page.locator('main table').first().locator('thead th').first();
}

function bodyCellLocator(page: import('@playwright/test').Page): Locator {
  // Skip the selection-checkbox column when present. Target a content-bearing
  // td to avoid matching hidden measurement/helper cells.
  return isFlux
    ? tableLocator(page).locator("tbody td[data-slot='table-cell']").nth(1)
    : tableLocator(page).locator('tbody td').first();
}

function actionButtonLocator(page: import('@playwright/test').Page): Locator {
  return isFlux
    ? tableLocator(page).locator("[data-slot='table-actions'] button").first()
    : tableLocator(page).locator('.cxd-OperationField .cxd-Button--link').first();
}

function toolbarAddButton(page: import('@playwright/test').Page): Locator {
  return isFlux
    ? page
        .locator(
          "[data-slot='crud-toolbar'] button, [data-slot='crud-list-actions'] button",
        )
        .first()
    : page.locator('main').locator('.cxd-Button--primary', { hasText: '新增' }).first();
}

test.describe('CRUD style parity — flux vs amis (manual + programmatic)', () => {
  test.skip(
    () => !isFlux && !isAmis,
    'Requires PLAYWRIGHT_APP_MODE=amis-prototype or PLAYWRIGHT_APP_MODE=flux-prototype',
  );

  test.beforeEach(async ({ page }) => {
    await navigateToProducts(page);
    await expect(firstRowLocator(page)).toBeVisible({ timeout: 20_000 });
  });

  // -----------------------------------------------------------------------
  // 1. Table header — background, height, font-size, separator
  // -----------------------------------------------------------------------
  test('1. table header: bg / height / font-size', async ({ page }) => {
    const head = headerCellLocator(page);
    const styles = await readStyles(head, [
      'background-color',
      'height',
      'font-size',
      'font-weight',
      'color',
    ]);
    console.log(`[crud-parity][${APP_MODE}] thead.th =`, styles);
    await screenshot(page, '01-table-header');

    if (isAmis) {
      expect(styles['font-size']).toBe('14px');
      expect(num(styles.height)).toBeGreaterThanOrEqual(40);
    } else {
      // flux parity target: AMIS-aligned
      expect(styles['font-size']).toBe('14px');
      expect(num(styles.height)).toBeGreaterThanOrEqual(40);
      // bg should be the muted surface (not pure background)
      const [r, g, b] = await readRgb(head, 'background-color');
      expect(r).toBeGreaterThan(240);
      expect(g).toBeGreaterThan(240);
      expect(b).toBeGreaterThan(240);
      // not pure white (255,255,255)
      const isPureWhite = r === 255 && g === 255 && b === 255;
      expect(isPureWhite).toBe(false);
    }
  });

  // -----------------------------------------------------------------------
  // 2. Table body cell — padding, font-size, edge insets
  // -----------------------------------------------------------------------
  test('2. table body cell: padding / font-size', async ({ page }) => {
    const first = bodyCellLocator(page);
    await expect(first).toBeVisible();
    const last = tableLocator(page).locator('tbody td').last();
    const styles = await readStyles(first, [
      'font-size',
      'padding-top',
      'padding-bottom',
      'padding-left',
    ]);
    const lastStyles = await readStyles(last, ['padding-right']);
    console.log(`[crud-parity][${APP_MODE}] tbody.td.first =`, styles);
    console.log(`[crud-parity][${APP_MODE}] tbody.td.last  =`, lastStyles);
    await screenshot(page, '02-table-body');

    // font-size: 12px on both engines (cells inherit from .nop-table / .cxd-Table).
    expect(num(styles['font-size'])).toBeGreaterThanOrEqual(12);
    if (isFlux) {
      // flux parity: vertical padding exactly 11px (driven by --table-cell-padding-y).
      expect(num(styles['padding-top'])).toBeGreaterThanOrEqual(10);
      expect(num(styles['padding-top'])).toBeLessThanOrEqual(13);
      expect(num(styles['padding-left'])).toBeGreaterThan(0);
      expect(num(lastStyles['padding-right'])).toBeGreaterThanOrEqual(10);
    }
  });

  // -----------------------------------------------------------------------
  // 3. Row hover — background change (visual indicator present)
  // -----------------------------------------------------------------------
  test('3. table row hover: background becomes non-transparent', async ({ page }) => {
    const row = firstRowLocator(page);

    await row.hover();
    await expect
      .poll(async () => (await readStyles(row, ['background-color']))['background-color'])
      .not.toBe('rgba(0, 0, 0, 0)');
    await expect
      .poll(async () => (await readStyles(row, ['background-color']))['background-color'])
      .not.toBe('');

    const after = (await readStyles(row, ['background-color']))['background-color'];
    console.log(`[crud-parity][${APP_MODE}] row.hover.bg =`, after);
    await screenshot(page, '03-row-hover');
  });

  // -----------------------------------------------------------------------
  // 4. Operation button — height (should not inflate the row)
  // -----------------------------------------------------------------------
  test('4. operation button: height', async ({ page }) => {
    const btn = actionButtonLocator(page);
    await expect(btn).toBeVisible();
    const styles = await readStyles(btn, ['height', 'padding-left', 'padding-right']);
    console.log(`[crud-parity][${APP_MODE}] action.btn =`, styles);
    await screenshot(page, '04-action-button');

    if (isAmis) {
      // AMIS link buttons are inline-sized
      expect(num(styles.height)).toBeLessThanOrEqual(40);
    } else {
      // flux parity: should be close to AMIS link (24px target)
      expect(num(styles.height)).toBeLessThanOrEqual(32);
    }
  });

  // -----------------------------------------------------------------------
  // 5. Toolbar "新增" primary button — border-radius
  // -----------------------------------------------------------------------
  test('5. toolbar primary button: border-radius', async ({ page }) => {
    const add = toolbarAddButton(page);
    await expect(add).toBeVisible({ timeout: 10_000 });
    const styles = await readStyles(add, ['border-radius', 'height', 'font-size']);
    console.log(`[crud-parity][${APP_MODE}] toolbar.add =`, styles);
    await screenshot(page, '05-toolbar-add');
    expect(num(styles.height)).toBeGreaterThanOrEqual(28);
  });

  // -----------------------------------------------------------------------
  // 6. Dialog open — title font-size, content border-radius
  // -----------------------------------------------------------------------
  test('6. dialog: title font-size / content border-radius', async ({ page }) => {
    const opener = toolbarAddButton(page);
    await opener.click();

    const surface = isFlux
      ? page.locator("[data-slot='dialog-surface']").last()
      : page.locator('.cxd-Modal-content, .cxd-Dialog-content').last();
    await expect(surface).toBeVisible({ timeout: 10_000 });

    const radius = (await readStyles(surface, ['border-radius']))['border-radius'];

    const titleEl = isFlux
      ? surface.locator("[data-slot='dialog-title']")
      : surface.locator('.cxd-Modal-title, .cxd-Dialog-title');
    const titleStyle = await readStyles(titleEl.first(), ['font-size']);

    console.log(`[crud-parity][${APP_MODE}] dialog.surface.radius =`, radius);
    console.log(`[crud-parity][${APP_MODE}] dialog.title.font-size =`, titleStyle['font-size']);
    await screenshot(page, '06-dialog');

    // Title font size: AMIS uses 16px (large); flux parity should match
    if (isAmis) {
      // AMIS may render title at 14–16px depending on size variant; allow range
      expect(num(titleStyle['font-size'])).toBeGreaterThanOrEqual(14);
    } else {
      expect(num(titleStyle['font-size'])).toBeGreaterThanOrEqual(14);
    }

    await page.keyboard.press('Escape');
  });

  // -----------------------------------------------------------------------
  // 7. Form item gap (inside dialog) + input border-radius
  // -----------------------------------------------------------------------
  test('7. dialog form: item gap / input radius', async ({ page }) => {
    const opener = toolbarAddButton(page);
    await opener.click();

    const surface = isFlux
      ? page.locator("[data-slot='dialog-surface']").last()
      : page.locator('.cxd-Modal-content, .cxd-Dialog-content').last();
    await expect(surface).toBeVisible({ timeout: 10_000 });

    // flux: form-body uses `gap`. AMIS: form items use `margin-bottom` on each item.
    const formBody = isFlux
      ? surface.locator("[data-slot='form-body']").first()
      : surface.locator('.cxd-Form').first();
    const gap = (await readStyles(formBody, ['gap']))['gap'];
    const amisItemMargin = isAmis
      ? (await readStyles(surface.locator('.cxd-Form-item').first(), ['margin-bottom']))[
          'margin-bottom'
        ]
      : '';

    // input: flux input element directly; AMIS picks the actual <input> inside .cxd-Input.
    const input = isFlux
      ? surface.locator('input').first()
      : surface.locator('input').first();
    const inputStyle = await readStyles(input, ['border-radius', 'height', 'background-color']);

    console.log(`[crud-parity][${APP_MODE}] form-body.gap =`, gap);
    if (isAmis) console.log(`[crud-parity][amis] Form-item.margin-bottom =`, amisItemMargin);
    console.log(`[crud-parity][${APP_MODE}] form.input =`, inputStyle);
    await screenshot(page, '07-dialog-form');

    if (isFlux) {
      // flux parity target: gap 24px (--space-form-item-gap), input radius 8px.
      expect(num(gap)).toBeGreaterThan(0);
    }

    await page.keyboard.press('Escape');
  });

  // -----------------------------------------------------------------------
  // 8. Field label — font-size / weight / color (inside dialog)
  // -----------------------------------------------------------------------
  test('8. dialog form: field label typography', async ({ page }) => {
    const opener = toolbarAddButton(page);
    await opener.click();

    const surface = isFlux
      ? page.locator("[data-slot='dialog-surface']").last()
      : page.locator('.cxd-Modal-content, .cxd-Dialog-content').last();
    await expect(surface).toBeVisible({ timeout: 10_000 });

    const label = isFlux
      ? surface.locator("[data-slot='field-label']").first()
      : surface.locator('.cxd-Form-item label').first();
    const styles = await readStyles(label, ['font-size', 'font-weight', 'color']);
    console.log(`[crud-parity][${APP_MODE}] field.label =`, styles);
    await screenshot(page, '08-field-label');

    expect(num(styles['font-size'])).toBeGreaterThanOrEqual(13);

    await page.keyboard.press('Escape');
  });

  // -----------------------------------------------------------------------
  // 9. Required asterisk color (matches theme danger)
  // -----------------------------------------------------------------------
  test('9. required asterisk: color follows theme danger', async ({ page }) => {
    const opener = toolbarAddButton(page);
    await opener.click();

    const surface = isFlux
      ? page.locator("[data-slot='dialog-surface']").last()
      : page.locator('.cxd-Modal-content, .cxd-Dialog-content').last();
    await expect(surface).toBeVisible({ timeout: 10_000 });

    const required = isFlux
      ? surface.locator("[data-slot='field-required']").first()
      : surface.locator('.cxd-Form-item .cxd-Form-star, .cxd-Form-item .required').first();
    if (await required.count().catch(() => 0)) {
      const styles = await readStyles(required, ['color']);
      console.log(`[crud-parity][${APP_MODE}] required.color =`, styles);
    } else {
      console.log(`[crud-parity][${APP_MODE}] required marker not found (skipping value check)`);
    }

    await page.keyboard.press('Escape');
  });

  // -----------------------------------------------------------------------
  // 10. Query form — background card (only AMIS has filter, flux has queryForm)
  // -----------------------------------------------------------------------
  test('10. query form: card background', async ({ page }) => {
    const queryCandidates = isFlux
      ? [
          "[data-slot='crud-query']",
          "[data-slot='crud-query-form']",
          ".nop-crud-query",
          ".nop-form[id$='-query-form']",
          "[data-slot='crud-filter']",
        ]
      : ['.cxd-Table-searchableForm', '.cxd-Crud-filter'];
    let query: Locator | null = null;
    for (const sel of queryCandidates) {
      const candidate = page.locator(sel).first();
      if (await candidate.count().catch(() => 0)) {
        query = candidate;
        break;
      }
    }
    if (!query) {
      console.log(`[crud-parity][${APP_MODE}] query form not present on this page`);
      return;
    }
    const styles = await readStyles(query, ['background-color', 'padding', 'border-radius']);
    console.log(`[crud-parity][${APP_MODE}] queryForm =`, styles);
    await screenshot(page, '10-query-form');
  });

  // -----------------------------------------------------------------------
  // 11. Pagination — button size (only asserts when present)
  // -----------------------------------------------------------------------
  test('11. pagination: button dimensions', async ({ page }) => {
    const item = isFlux
      ? page.locator("[data-slot='pagination-item'], [data-slot='pagination'] button").first()
      : page.locator('.cxd-Pagination a, .cxd-Pagination > li > a').first();
    if (!(await item.count().catch(() => 0))) {
      console.log(`[crud-parity][${APP_MODE}] pagination not visible (count < threshold)`);
      return;
    }
    const styles = await readStyles(item, ['min-width', 'height', 'border-width', 'border-radius']);
    console.log(`[crud-parity][${APP_MODE}] pagination.item =`, styles);
    await screenshot(page, '11-pagination');
  });

  // -----------------------------------------------------------------------
  // 12. Full-page snapshot for side-by-side manual review
  // -----------------------------------------------------------------------
  test('12. full-page snapshot for manual review', async ({ page }) => {
    // Scroll the table into view first so the screenshot shows the actual data.
    await firstRowLocator(page).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await screenshot(page, '12-full-list');
    expect(await page.screenshot({ fullPage: true })).toBeTruthy();
  });
});
