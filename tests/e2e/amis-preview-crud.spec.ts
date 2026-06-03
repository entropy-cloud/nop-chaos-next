import { expect, test } from '@playwright/test';
import { login } from './support/auth';

test.describe('AMIS preview CRUD integration', () => {
  test('row action buttons stay on one line and AMIS confirm uses compact radius', async ({ page }) => {
    await login(page);
    await page.getByRole('button', { name: 'Amis Preview' }).click();

    await expect(page).toHaveURL(/\/amis\/preview$/);
    const row = page.locator('main table tbody tr').first();
    await expect(row).toBeVisible();

    const actionCell = row.locator('td').last();
    const operationLayout = await actionCell.locator('.cxd-OperationField').evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        display: style.display,
        flexWrap: style.flexWrap,
        whiteSpace: style.whiteSpace,
      };
    });

    expect(operationLayout.display).toContain('flex');
    expect(operationLayout.flexWrap).toBe('nowrap');
    expect(operationLayout.whiteSpace).toBe('nowrap');

    const viewButton = actionCell.getByRole('button', { name: 'View' });
    const moreButton = actionCell.getByRole('button', { name: /More/i });
    const viewBox = await viewButton.boundingBox();
    const moreBox = await moreButton.boundingBox();
    expect(viewBox).toBeTruthy();
    expect(moreBox).toBeTruthy();

    if (viewBox && moreBox) {
      expect(moreBox.y).toBeLessThan(viewBox.y + viewBox.height);
      expect(viewBox.y).toBeLessThan(moreBox.y + moreBox.height);
      expect(moreBox.x).toBeGreaterThan(viewBox.x);
    }

    await moreButton.click();
    await page.getByRole('listitem').filter({ hasText: 'Delete' }).click();

    const dialog = page.locator('[role="alertdialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Confirm delete Alpha release verification?');
    await expect(dialog).toHaveClass(/amis-confirm-dialog/);

    const dialogStyle = await dialog.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        borderRadius: style.borderRadius,
      };
    });

    expect(dialogStyle.borderRadius).not.toBe('16px');
    await page.keyboard.press('Escape');
  });
});
