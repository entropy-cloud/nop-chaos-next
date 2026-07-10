import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { login } from './support/auth';

const demoRoutesMenuResponse = {
  status: 0,
  data: {
    children: [
      {
        id: 'flow-editor',
        displayName: 'Flow Editor',
        routePath: '/flow-editor',
        component: 'flow-editor',
        hidden: false,
        meta: { sort: 1 },
        children: [
          {
            id: 'flow-editor-list',
            displayName: 'Flow Editor',
            routePath: '/flow-editor',
            component: 'flow-editor',
            hidden: false,
          },
          {
            id: 'flow-editor-edit',
            displayName: 'Flow Editor Edit',
            routePath: '/flow-editor/:id',
            component: 'flow-editor/:id',
            hidden: true,
          },
        ],
      },
      {
        id: 'plugins',
        displayName: 'Plugins',
        routePath: '/plugins',
        component: 'plugins',
        hidden: false,
        meta: { sort: 2 },
        children: [
          {
            id: 'plugins-management',
            displayName: 'Plugin management',
            routePath: '/plugins/management',
            component: 'plugins/management',
            hidden: false,
          },
          {
            id: 'plugins-demo',
            displayName: 'Plugin Demo',
            routePath: '/plugins/demo',
            component: 'plugin',
            hidden: false,
            url: '/plugins/plugin-demo.system.js',
          },
        ],
      },
    ],
  },
};

async function useSeededDemoMenu(page: Page) {
  await page.route('**/r/SiteMapApi__getSiteMap', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(demoRoutesMenuResponse),
    });
  });
}

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
