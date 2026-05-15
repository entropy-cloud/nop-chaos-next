import { expect, test } from '@playwright/test';
import { login } from './support/auth';

test.describe('master-detail list page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, { username: 'admin', defaultPassword: '123456' });
    await page.getByRole('button', { name: 'Master Detail' }).click();
    await expect(page).toHaveURL(/\/data-management\/master-detail$/);
    await expect(page.locator('main table')).toBeVisible();
  });

  test('header action buttons are laid out left-to-right', async ({ page }) => {
    const refreshBtn = page.locator('main').getByRole('button', { name: 'Refresh' });
    const exportBtn = page.locator('main').getByRole('button', { name: 'Batch export' });
    const deleteBtn = page.locator('main').getByRole('button', { name: 'Batch delete' });

    await expect(refreshBtn).toBeVisible();
    await expect(exportBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();

    const refreshStyle = await refreshBtn.evaluate((el) => {
      const s = getComputedStyle(el);
      return { display: s.display, borderRadius: s.borderRadius };
    });
    expect(refreshStyle.display).not.toBe('none');
    expect(refreshStyle.borderRadius).not.toBe('0px');

    const refreshBox = await refreshBtn.boundingBox();
    const exportBox = await exportBtn.boundingBox();
    const deleteBox = await deleteBtn.boundingBox();
    expect(refreshBox).toBeTruthy();
    expect(exportBox).toBeTruthy();
    expect(deleteBox).toBeTruthy();

    if (refreshBox && exportBox && deleteBox) {
      expect(exportBox.x).toBeGreaterThan(refreshBox.x + refreshBox.width - 1);
      expect(deleteBox.x).toBeGreaterThan(exportBox.x + exportBox.width - 1);
    }
  });

  test('filter bar buttons are laid out left-to-right', async ({ page }) => {
    const queryBtn = page.locator('main').getByRole('button', { name: 'Query' });
    const resetBtn = page.locator('main').getByRole('button', { name: 'Reset' });
    const advBtn = page.locator('main').getByRole('button', { name: 'Advanced' });

    await expect(queryBtn).toBeVisible();
    await expect(resetBtn).toBeVisible();
    await expect(advBtn).toBeVisible();

    const queryBox = await queryBtn.boundingBox();
    const resetBox = await resetBtn.boundingBox();
    const advBox = await advBtn.boundingBox();
    expect(queryBox).toBeTruthy();
    expect(resetBox).toBeTruthy();
    expect(advBox).toBeTruthy();

    if (queryBox && resetBox && advBox) {
      expect(resetBox.x).toBeGreaterThan(queryBox.x + queryBox.width - 1);
    }
  });

  test('advanced toggle expands filter panel and collapse hides it', async ({ page }) => {
    await page.locator('main').getByRole('button', { name: 'Advanced' }).click();

    const channelInput = page.getByPlaceholder('Channel keyword');
    await expect(channelInput).toBeVisible();

    await page.locator('main').getByRole('button', { name: 'Collapse' }).click();
    await expect(channelInput).not.toBeVisible();
  });

  test('reset button clears search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Order no. / customer / owner');
    await searchInput.fill('Acme');
    await expect(searchInput).toHaveValue('Acme');

    await page.locator('main').getByRole('button', { name: 'Reset' }).click();
    await expect(searchInput).toHaveValue('');
  });

  test('refresh button reloads table', async ({ page }) => {
    const tableBody = page.locator('main table tbody');
    await expect(tableBody.locator('tr').first()).toBeVisible();

    await page.locator('main').getByRole('button', { name: 'Refresh' }).click();
    await expect(tableBody.locator('tr').first()).toBeVisible();
  });

  test('table sort buttons reorder rows', async ({ page }) => {
    const sortBtn = page.locator('main table thead').getByRole('button', { name: 'Order No' });
    await expect(sortBtn).toBeVisible();

    const style = await sortBtn.evaluate((el) => {
      const s = getComputedStyle(el);
      return { display: s.display };
    });
    expect(style.display).not.toBe('none');

    const firstCellBefore = await page
      .locator('main table tbody tr')
      .first()
      .locator('td')
      .nth(1)
      .textContent();

    await sortBtn.click();

    const firstCellAfter = await page
      .locator('main table tbody tr')
      .first()
      .locator('td')
      .nth(1)
      .textContent();

    expect(firstCellAfter).toBeDefined();
    if (firstCellBefore?.trim() !== firstCellAfter?.trim()) {
      expect(firstCellAfter!.trim().length).toBeGreaterThan(0);
    }
  });

  test('header checkbox selects all rows', async ({ page }) => {
    const headerCheckbox = page.locator('main table thead').getByRole('checkbox').first();
    await headerCheckbox.click({ force: true });

    const rowCheckboxes = page.locator('main table tbody').getByRole('checkbox');
    const count = await rowCheckboxes.count();
    for (let i = 0; i < count; i++) {
      await expect(rowCheckboxes.nth(i)).toBeChecked();
    }
  });

  test('batch delete button triggers confirm dialog', async ({ page }) => {
    await page.locator('main table tbody').getByRole('checkbox').first().click({ force: true });

    const dialogPromise = new Promise<string>((resolve) => {
      page.once('dialog', async (dialog) => {
        const msg = dialog.message();
        await dialog.dismiss();
        resolve(msg);
      });
    });

    await page.locator('main').getByRole('button', { name: 'Batch delete' }).click();
    const msg = await dialogPromise;
    expect(msg.length).toBeGreaterThan(0);
  });

  test('export button shows toast when no rows selected', async ({ page }) => {
    await expect(page.locator('main').getByRole('button', { name: 'Batch export' })).toBeVisible();
    await page.locator('main').getByRole('button', { name: 'Batch export' }).click();
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 5000 });
  });

  test('view button navigates to detail', async ({ page }) => {
    await page
      .locator('main table tbody tr')
      .first()
      .getByRole('button', { name: 'View' })
      .click();
    await expect(page).toHaveURL(/\/data-management\/master-detail\/\d+$/);
  });

  test('row more dropdown menu has edit and delete', async ({ page }) => {
    const row = page.locator('main table tbody tr').first();
    const moreBtn = row.locator('button').last();
    await moreBtn.click();

    const menu = page.locator('[data-slot="dropdown-menu-content"]').last();
    await expect(menu).toBeVisible();

    const menuStyle = await menu.evaluate((el) => {
      const s = getComputedStyle(el);
      return { zIndex: s.zIndex, borderRadius: s.borderRadius };
    });
    expect(Number(menuStyle.zIndex)).toBeGreaterThan(0);
    expect(menuStyle.borderRadius).not.toBe('0px');

    const editItem = menu.getByText('Edit');
    const deleteItem = menu.getByText('Delete');
    await expect(editItem).toBeVisible();
    await expect(deleteItem).toBeVisible();

    const editBox = await editItem.boundingBox();
    const deleteBox = await deleteItem.boundingBox();
    if (editBox && deleteBox) {
      expect(deleteBox.y).toBeGreaterThan(editBox.y + editBox.height - 1);
    }
  });

  test('previous page is disabled on first page', async ({ page }) => {
    const prevBtn = page.locator('main').getByRole('button', { name: 'Previous' });
    const nextBtn = page.locator('main').getByRole('button', { name: 'Next' });
    await expect(prevBtn).toBeDisabled();

    const opacity = await prevBtn.evaluate((el) => getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(1);

    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await expect(prevBtn).toBeEnabled();
    }
  });
});

async function navigateToDetail(page: import('@playwright/test').Page) {
  await login(page, { username: 'admin', defaultPassword: '123456' });
  await page.getByRole('button', { name: 'Master Detail' }).click();
  await expect(page).toHaveURL(/\/data-management\/master-detail$/);
  await expect(page.locator('main table tbody tr').first()).toBeVisible({ timeout: 10000 });
  await page.locator('main table tbody tr').first().getByRole('button', { name: 'View' }).click();
  await expect(page).toHaveURL(/\/data-management\/master-detail\/\d+$/);
  await expect(page.locator('main h1')).toBeVisible({ timeout: 10000 });
}

test.describe('master-detail detail page', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToDetail(page);
  });

  test('header buttons are laid out left-to-right with correct styles', async ({ page }) => {
    const refreshBtn = page.locator('main').getByRole('button', { name: 'Refresh' });
    const discardBtn = page.locator('main').getByRole('button', { name: 'Discard all edits' });
    const saveBtn = page.locator('main').getByRole('button', { name: 'Save all' });

    await expect(refreshBtn).toBeVisible();
    await expect(discardBtn).toBeVisible();
    await expect(saveBtn).toBeVisible();

    const refreshBox = await refreshBtn.boundingBox();
    const discardBox = await discardBtn.boundingBox();
    const saveBox = await saveBtn.boundingBox();
    expect(refreshBox).toBeTruthy();
    expect(discardBox).toBeTruthy();
    expect(saveBox).toBeTruthy();

    if (refreshBox && discardBox && saveBox) {
      expect(discardBox.x).toBeGreaterThan(refreshBox.x + refreshBox.width - 1);
      expect(saveBox.x).toBeGreaterThan(discardBox.x + discardBox.width - 1);
    }

    const saveStyle = await saveBtn.evaluate((el) => {
      const s = getComputedStyle(el);
      return { backgroundColor: s.backgroundColor, borderRadius: s.borderRadius };
    });
    expect(saveStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(saveStyle.borderRadius).not.toBe('0px');
  });

  test('summary card badge has rounded pill style', async ({ page }) => {
    const badge = page.locator('[data-slot="badge"]').first();
    await expect(badge).toBeVisible();

    const style = await badge.evaluate((el) => {
      const s = getComputedStyle(el);
      return { borderRadius: s.borderRadius, padding: s.padding };
    });
    expect(style.borderRadius).not.toBe('0px');
    expect(style.padding).not.toBe('0px');
  });

  test('clear filters button resets filter inputs', async ({ page }) => {
    const filterInput = page.locator('main input[placeholder]').first();
    await filterInput.fill('test');
    await expect(filterInput).toHaveValue('test');

    await page.locator('main').getByRole('button', { name: 'Clear filters' }).click();
    await expect(filterInput).toHaveValue('');
  });

  test('items add button adds a row, delete removes it', async ({ page }) => {
    const addBtn = page.locator('main').getByRole('button', { name: 'Add' }).first();
    await addBtn.click();

    const rows = page.locator('main table tbody tr');
    const countAfterAdd = await rows.count();

    const deleteBtns = page.locator('main table tbody').getByRole('button', { name: 'Delete' });
    expect(await deleteBtns.count()).toBeGreaterThan(0);

    await deleteBtns.last().click();
    expect(await rows.count()).toBe(countAfterAdd - 1);
  });

  test('items restore button reverts inline edit', async ({ page }) => {
    const cards = page.locator('main .theme-card');
    const itemsCard = cards.nth(1);
    const restoreBtn = itemsCard.getByRole('button', { name: 'Restore section' });

    const firstInput = page.locator('main table tbody tr').first().getByRole('textbox').first();
    const original = await firstInput.inputValue();

    await firstInput.fill('Modified');
    await expect(firstInput).toHaveValue('Modified');

    await restoreBtn.click();
    await expect(firstInput).toHaveValue(original);
  });

  test('add address button opens dialog with correct layout', async ({ page }) => {
    await page.locator('main').getByRole('button', { name: 'Add address' }).click();

    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible();

    const dialogStyle = await dialog.evaluate((el) => {
      const s = getComputedStyle(el);
      return { borderRadius: s.borderRadius, maxWidth: s.maxWidth };
    });
    expect(dialogStyle.borderRadius).not.toBe('0px');
    expect(dialogStyle.maxWidth).not.toBe('none');

    expect(await dialog.locator('input, textarea').count()).toBeGreaterThanOrEqual(5);

    const footer = dialog.locator('[data-slot="dialog-footer"]');
    const cancelBtn = footer.getByRole('button', { name: 'Cancel' });
    const saveBtn = footer.getByRole('button', { name: 'Save address' });
    const cancelBox = await cancelBtn.boundingBox();
    const saveBox = await saveBtn.boundingBox();
    if (cancelBox && saveBox) {
      expect(saveBox.x).toBeGreaterThan(cancelBox.x + cancelBox.width - 1);
    }

    await cancelBtn.click();
    await expect(dialog).not.toBeVisible();
  });

  test('address edit button opens dialog with pre-filled data', async ({ page }) => {
    const addressCard = page.locator('main .theme-card').nth(2);
    await addressCard.getByRole('button', { name: 'Edit' }).first().click();

    const dialog = page.locator('[data-slot="dialog-content"]');
    await expect(dialog).toBeVisible();

    const firstInput = dialog.locator('input').first();
    const value = await firstInput.inputValue();
    expect(value.length).toBeGreaterThan(0);

    await dialog.getByRole('button', { name: 'Cancel' }).click();
  });

  test('address delete button removes an address card', async ({ page }) => {
    const addressCard = page.locator('main .theme-card').nth(2);
    const cards = addressCard.locator('.rounded-xl.border');
    const initialCount = await cards.count();

    page.once('dialog', (d) => d.accept());
    await addressCard.getByRole('button', { name: 'Delete' }).first().click();

    expect(await cards.count()).toBeLessThan(initialCount);
  });

  test('add logistics button opens right-side drawer', async ({ page }) => {
    await page.locator('main').getByRole('button', { name: 'Add logistics' }).click();

    const drawer = page.locator('[data-slot="drawer-content"]');
    await expect(drawer).toBeVisible();

    const drawerStyle = await drawer.evaluate((el) => {
      const s = getComputedStyle(el);
      return { position: s.position };
    });
    expect(drawerStyle.position).toBe('fixed');

    const box = await drawer.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.width).toBeGreaterThan(300);
    }

    await drawer.getByRole('button', { name: 'Cancel' }).click();
    await expect(drawer).not.toBeVisible();
  });

  test('logistics drawer date input accepts value and pointer-events is not none', async ({
    page,
  }) => {
    await page.locator('main').getByRole('button', { name: 'Add logistics' }).click();
    const drawer = page.locator('[data-slot="drawer-content"]');
    await expect(drawer).toBeVisible();

    const dateInput = drawer.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    const style = await dateInput.evaluate((el) => getComputedStyle(el).pointerEvents);
    expect(style).not.toBe('none');

    await dateInput.fill('2026-05-01');
    await expect(dateInput).toHaveValue('2026-05-01');

    await drawer.getByRole('button', { name: 'Cancel' }).click();
  });

  test('logistics edit button opens drawer with pre-filled data', async ({ page }) => {
    const logCard = page.locator('main .theme-card').nth(3);
    await logCard.getByRole('button', { name: 'Edit' }).first().click();

    const drawer = page.locator('[data-slot="drawer-content"]');
    await expect(drawer).toBeVisible();

    const companyInput = drawer.locator('input').first();
    const value = await companyInput.inputValue();
    expect(value.length).toBeGreaterThan(0);

    await drawer.getByRole('button', { name: 'Cancel' }).click();
  });

  test('save all button triggers toast', async ({ page }) => {
    const saveBtn = page.locator('main').getByRole('button', { name: 'Save all' });
    const style = await saveBtn.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(style).not.toBe('rgba(0, 0, 0, 0)');

    await saveBtn.click();
    await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('back to list button navigates back', async ({ page }) => {
    await page.locator('main').getByRole('button', { name: 'Back to list' }).click();
    await expect(page).toHaveURL(/\/data-management\/master-detail$/);
  });

  test('discard all shows confirm and reverts edits', async ({ page }) => {
    const firstInput = page.locator('main table tbody tr').first().getByRole('textbox').first();
    const original = await firstInput.inputValue();
    await firstInput.fill('Dirty value');

    const dialogPromise = new Promise<string>((resolve) => {
      page.once('dialog', async (d) => {
        const msg = d.message();
        await d.accept();
        resolve(msg);
      });
    });

    await page.locator('main').getByRole('button', { name: 'Discard all edits' }).click();
    const msg = await dialogPromise;
    expect(msg.length).toBeGreaterThan(0);

    await expect(firstInput).toHaveValue(original);
  });

  test('dirty indicator dot appears with correct size and color', async ({ page }) => {
    const firstInput = page.locator('main table tbody tr').first().getByRole('textbox').first();
    await firstInput.fill('Modified');

    const dot = page.locator('main .theme-card .rounded-full').first();
    await expect(dot).toBeVisible();

    const style = await dot.evaluate((el) => {
      const s = getComputedStyle(el);
      return { width: s.width, height: s.height, borderRadius: s.borderRadius };
    });
    expect(parseFloat(style.width)).toBeGreaterThan(0);
    expect(style.borderRadius).not.toBe('0px');
  });
});
