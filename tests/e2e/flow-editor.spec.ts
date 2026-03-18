import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

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
            hidden: false
          },
          {
            id: 'flow-editor-edit',
            displayName: 'Flow Editor Edit',
            routePath: '/flow-editor/:id',
            component: 'flow-editor/:id',
            hidden: true
          }
        ]
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
            hidden: false
          },
          {
            id: 'plugins-demo',
            displayName: 'Plugin Demo',
            routePath: '/plugins/demo',
            component: 'plugin',
            hidden: false,
            url: '/plugins/plugin-demo.system.js'
          }
        ]
      }
    ]
  }
}

async function useSeededDemoMenu(page: Page) {
  await page.route('**/r/SiteMapApi__getSiteMap', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(demoRoutesMenuResponse)
    })
  })
}

async function login(page: Page) {
  await useSeededDemoMenu(page)
  await page.goto('/')
  await page.locator('input').first().fill('nop')
  await page.locator('input[type="password"]').fill('123')
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/flow-editor$/)
}

test('flow editor supports grouped palette, canvas editing, and minimap with seeded demo routes', async ({ page }) => {
  await login(page)

  await page.getByRole('row', { name: /customer onboarding/i }).getByRole('button', { name: /^edit$/i }).click()
  await expect(page).toHaveURL(/\/flow-editor\/flow-101$/)

  await expect(page.getByText(/basic nodes/i)).toBeVisible()
  await expect(page.getByText(/logic nodes/i)).toBeVisible()
  await expect(page.getByText(/execution nodes/i)).toBeVisible()
  await expect(page.locator('[data-testid="palette-item-task"]')).toBeVisible()
  await expect(page.locator('.react-flow__minimap')).toBeVisible()

  const dropzone = page.locator('[data-testid="flow-canvas-dropzone"]')
  const taskPaletteItem = page.locator('[data-testid="palette-item-task"]')

  await taskPaletteItem.dragTo(dropzone, {
    targetPosition: { x: 280, y: 220 }
  })

  await expect(page.locator('[data-testid^="flow-node-task-"]')).toHaveCount(2)

  const firstNode = page.locator('[data-testid^="flow-node-task-"]').first()
  await firstNode.dblclick()
  await expect(page.getByText('发送欢迎邮件').first()).toBeVisible()
  await page.locator('label', { hasText: /name/i }).locator('..').getByRole('textbox').fill('Automation approval task')
  await expect(page.locator('[data-testid^="flow-node-task-"]').first()).toContainText('Automation approval task')

  const firstEdgeHitbox = page.locator('[data-testid^="edge-hitbox-"]').first()
  const firstEdgeLabel = page.locator('[data-testid^="edge-label-"]').first()
  await firstEdgeHitbox.dispatchEvent('dblclick')
  const edgeConditionField = page.locator('label', { hasText: /condition/i }).locator('..').getByRole('textbox')
  await expect(edgeConditionField).toBeVisible()
  await edgeConditionField.fill('score > 80')
  await expect(firstEdgeLabel).toContainText('score > 80')
})
