import { expect } from '@playwright/test';
import { test, login } from '@nop-chaos/e2e-shared';
import { demoRoutesMenuResponse, useSeededDemoMenu } from './support/demoRoutes';

test('flow editor supports grouped palette, canvas editing, and minimap with seeded demo routes', async ({
  page,
}) => {
  await login(page);
  await page.getByRole('button', { name: 'Flow Library' }).click();
  await page.locator('main tbody tr').first().getByRole('button', { name: 'Edit' }).click();
  await expect(page).toHaveURL(/\/flow-editor\/flow-101$/);

  await expect(page.locator('[data-testid="palette-item-task"]')).toBeVisible();
  await expect(page.locator('.react-flow__minimap')).toBeVisible();

  await expect(page.locator('[data-testid^="flow-node-"]')).toHaveCount(6);

  await page.locator('[data-testid="palette-add-task"]').click();

  await expect(page.locator('[data-testid^="flow-node-"]')).toHaveCount(7);

  const originalNode = page.locator('[data-testid="flow-node-task-1"]');
  await expect(originalNode).toBeVisible();

  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="flow-node-task-1"]') as HTMLElement | null;
    if (el) {
      el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }
  });
  await page.waitForTimeout(500);
  await page
    .locator('label', { hasText: /name/i })
    .locator('..')
    .getByRole('textbox')
    .fill('Automation approval task');
  await expect(page.locator('[data-testid="flow-node-task-1"]')).toContainText(
    'Automation approval task',
    { timeout: 10_000 },
  );

  const firstEdgeHitbox = page.locator('[data-testid^="edge-hitbox-"]').first();
  const firstEdgeLabel = page.locator('[data-testid^="edge-label-"]').first();
  await firstEdgeHitbox.dispatchEvent('dblclick');
  const edgeConditionField = page
    .locator('label', { hasText: /condition/i })
    .locator('..')
    .getByRole('textbox');
  await expect(edgeConditionField).toBeVisible({ timeout: 10_000 });
  await edgeConditionField.fill('score > 80');
  await expect(firstEdgeLabel).toContainText('score > 80', { timeout: 10_000 });
});
