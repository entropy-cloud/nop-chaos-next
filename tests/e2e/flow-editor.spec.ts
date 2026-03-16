import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

async function login(page: Page) {
  await page.goto('/')
  await page.locator('input').first().fill('admin')
  await page.locator('input[type="password"]').fill('123456')
  await page.locator('button[type="submit"]').click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

test('flow editor supports grouped palette, canvas editing, and minimap', async ({ page }) => {
  await login(page)

  await page.goto('/flow-editor/flow-101')
  await expect(page).toHaveURL(/\/flow-editor\/flow-101$/)

  await expect(page.getByText('基础节点')).toBeVisible()
  await expect(page.getByText('逻辑节点')).toBeVisible()
  await expect(page.getByText('执行节点')).toBeVisible()
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
  await page.locator('label', { hasText: '节点名称' }).locator('..').getByRole('textbox').fill('自动化审批任务')
  await expect(page.locator('[data-testid^="flow-node-task-"]').first()).toContainText('自动化审批任务')

  const firstEdgeHitbox = page.locator('[data-testid^="edge-hitbox-"]').first()
  const firstEdgeLabel = page.locator('[data-testid^="edge-label-"]').first()
  await firstEdgeHitbox.dispatchEvent('dblclick')
  const edgeConditionField = page.locator('label', { hasText: '条件表达式' }).locator('..').getByRole('textbox')
  await expect(edgeConditionField).toBeVisible()
  await edgeConditionField.fill('score > 80')
  await expect(firstEdgeLabel).toContainText('score > 80')
})
