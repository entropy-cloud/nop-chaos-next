import { expect } from '@playwright/test';
import { test, mockLogin as login } from '@nop-chaos/e2e-shared';

const MODE = process.env.PLAYWRIGHT_APP_MODE ?? '';
const isFlux = MODE === 'flux-prototype';

/**
 * Regression: clicking selection checkboxes must NOT trigger a CRUD refetch.
 *
 * Root cause (fixed upstream 2026-08-10): `useCrudLoadAction`'s imperative
 * load effect included `selection` in its dependency array, so toggling a row
 * or header checkbox re-dispatched loadAction → extra GET → UI flicker.
 * Upstream test was a false positive (`input[type="checkbox"]` matches nothing
 * because flux Checkbox renders a Base UI span[role=checkbox]); the test now
 * queries [role="checkbox"] and the effect deps exclude selection (read via
 * selectionRef at dispatch time).
 *
 * See docs/testing/… for the full writeup.
 */
test.describe('flux selection must not refetch CRUD', () => {
  test.skip(() => !isFlux, 'Flux-only check');

  test('row checkbox click does not refetch; selection still toggles', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/mock/products')) {
        requests.push(`${req.method()} ${req.url()}`);
      }
    });

    await login(page, { username: 'proto', mockMenuRoutes: false });
    const nav = page.getByRole('navigation', { name: 'Primary navigation' }).first();
    await nav.getByRole('button', { name: '系统管理' }).click();
    await expect(nav.getByRole('button', { name: '产品管理' })).toBeVisible({ timeout: 10_000 });
    await nav.getByRole('button', { name: '产品管理' }).click();
    await expect(page.getByText('无线蓝牙耳机')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(800);

    const before = requests.length;

    const rowCheckbox = page
      .locator(
        "[data-slot='crud-table'] .nop-table tbody [data-slot='table-select-cell'] [data-slot='checkbox']",
      )
      .first();
    await rowCheckbox.click();
    await page.waitForTimeout(600);

    // No refetch.
    expect(requests.length).toBe(before);
    // Selection visually toggled (checkbox aria-checked changed).
    await expect(rowCheckbox).toHaveAttribute('data-checked', '');

    // Header (select-all) click also must not refetch.
    const headerCheckbox = page
      .locator(
        "[data-slot='crud-table'] .nop-table thead [data-slot='table-select-column'] [data-slot='checkbox']",
      )
      .first();
    await headerCheckbox.click();
    await page.waitForTimeout(600);
    expect(requests.length).toBe(before);
  });
});
