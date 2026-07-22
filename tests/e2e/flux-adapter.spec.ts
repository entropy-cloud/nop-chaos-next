import { expect } from '@playwright/test';
import { test, getEngineType, FluxAdapter, FormDialog } from '@nop-chaos/e2e-shared';
import { mockLogin as login } from '@nop-chaos/e2e-shared';
import { setupFluxCrudApiInterception } from './support/flux-crud-mock-data';

const COLUMNS = ['', 'name', 'owner', 'status', 'channel', ''];

test.describe('FluxAdapter selector verification', () => {
  const adapter = new FluxAdapter();

  test.beforeEach(async ({ page }) => {
    test.skip(getEngineType() !== 'flux', 'Flux-only test');
    await login(page, { mockMenuRoutes: false });
    await expect(page.getByRole('button', { name: 'Flux Demo' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Flux Demo' }).click();
    await expect(page.getByText('Flux JSON CRUD Demo')).toBeVisible({ timeout: 15_000 });
  });

  // ── CRUD 容器与表格 ──

  test('crudContainer locates .nop-crud', async ({ page }) => {
    const container = adapter.crudContainer(page);
    await expect(container).toBeVisible();
    expect(await container.getAttribute('class')).toContain('nop-crud');
  });

  test('table locates .nop-table', async ({ page }) => {
    const table = adapter.table(page);
    await expect(table).toBeVisible();
  });

  test('rows returns data rows with data-slot="table-row"', async ({ page }) => {
    const rows = adapter.rows(page);
    await expect(rows).toHaveCount(3);
  });

  test('cellValue reads correct text by column index', async ({ page }) => {
    const rows = adapter.rows(page);
    const row0 = rows.nth(0);
    const name = await adapter.cellValue(row0, 'name', COLUMNS);
    expect(name.trim()).toBe('Alice');
    const owner = await adapter.cellValue(row0, 'owner', COLUMNS);
    expect(owner.trim()).toContain('Iris Chen');
    const status = await adapter.cellValue(row0, 'status', COLUMNS);
    expect(status.trim()).toBe('active');
  });

  // ── 行操作 ──

  test('rowAction clicks Inspect button in table-actions', async ({ page }) => {
    const rows = adapter.rows(page);
    await adapter.rowAction(rows.nth(0), /Inspect/);
    const dialog = adapter.dialog(page);
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText(/User: Alice/)).toBeVisible();
  });

  test('rowAction clicks Edit Form button', async ({ page }) => {
    const rows = adapter.rows(page);
    await adapter.rowAction(rows.nth(1), /Edit Form/);
    const dialog = adapter.dialog(page);
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText('Edit Flux pipeline')).toBeVisible();
  });

  // ── 对话框 ──

  test('dialog locator finds dialog-surface after opening', async ({ page }) => {
    await page.getByRole('button', { name: 'Open create form' }).click();
    const dialog = adapter.dialog(page);
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText('Create Flux pipeline')).toBeVisible();
  });

  // ── 表单字段 setFieldValue ──

  test('setFieldValue fills text input (name)', async ({ page }) => {
    await page.getByRole('button', { name: 'Open create form' }).click();
    const dialog = adapter.dialog(page);
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await adapter.setFieldValue(dialog, 'name', 'TestPipeline42');
    const formDialog = new FormDialog(page, adapter);
    const value = await formDialog.getField('name');
    expect(value).toBe('TestPipeline42');
  });

  test('setFieldValue fills textarea (notes)', async ({ page }) => {
    await page.getByRole('button', { name: 'Open create form' }).click();
    const dialog = adapter.dialog(page);
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await adapter.setFieldValue(dialog, 'notes', 'Line one\nLine two');
    const formDialog = new FormDialog(page, adapter);
    const value = await formDialog.getField('notes');
    expect(value).toContain('Line one');
  });

  test('setFieldValue selects option from combobox (status)', async ({ page }) => {
    await page.getByRole('button', { name: 'Open create form' }).click();
    const dialog = adapter.dialog(page);
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await adapter.setFieldValue(dialog, 'status', 'Review');
    await page.waitForTimeout(500);

    const trigger = dialog.locator('#status-control').first();
    await expect(trigger).toContainText(/Review/i);
  });

  test('setFieldValue toggles switch (featured)', async ({ page }) => {
    await page.getByRole('button', { name: 'Open create form' }).click();
    const dialog = adapter.dialog(page);
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const switchEl = dialog.locator(
      '[data-slot="switch-wrapper"]:has(#featured-control) [role="switch"]',
    ).first();
    await expect(switchEl).toBeAttached({ timeout: 5_000 });

    await adapter.setFieldValue(dialog, 'featured', true);
    await page.waitForTimeout(500);
    expect(await switchEl.getAttribute('aria-checked')).toBe('true');

    await adapter.setFieldValue(dialog, 'featured', false);
    await page.waitForTimeout(500);
    expect(await switchEl.getAttribute('aria-checked')).toBe('false');
  });

  // ── FormDialog.getField 读取值 ──

  test('getField reads pre-filled value from edit dialog', async ({ page }) => {
    const rows = adapter.rows(page);
    await adapter.rowAction(rows.nth(0), /Edit Form/);
    const dialog = adapter.dialog(page);
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const formDialog = new FormDialog(page, adapter);
    const name = await formDialog.getField('name');
    expect(name).toBe('Alice');
  });

  // ── 搜索表单 ──

  test('searchField locates keyword input in crud-query', async ({ page }) => {
    const field = adapter.searchField(page, 'keyword');
    await expect(field).toBeVisible();
    await field.fill('Alice');
    await expect(field).toHaveValue('Alice');
  });

  // ── staticFieldValue ──

  test('staticFieldValue reads text from inspect dialog', async ({ page }) => {
    const rows = adapter.rows(page);
    await adapter.rowAction(rows.nth(0), /Inspect/);
    const dialog = adapter.dialog(page);
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const text = await dialog.textContent();
    expect(text).toContain('Alice');
    expect(text).toContain('Iris Chen');
    expect(text).toContain('Customer onboarding workflow');
  });

  // ── submitButton ──

  test('submitButton locates Submit pipeline button', async ({ page }) => {
    await setupFluxCrudApiInterception(page);
    await page.getByRole('button', { name: 'Open create form' }).click();
    const dialog = adapter.dialog(page);
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const btn = adapter.submitButton(dialog);
    await expect(btn).toBeVisible();
    await expect(btn).toHaveText(/Submit pipeline/i);
  });

  // ── formField locator ──

  test('formField locates input by name', async ({ page }) => {
    await page.getByRole('button', { name: 'Open create form' }).click();
    const dialog = adapter.dialog(page);
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const field = adapter.formField(dialog, 'name');
    await expect(field).toBeVisible();
    await field.fill('DirectFill');
    await expect(field).toHaveValue('DirectFill');
  });
});
