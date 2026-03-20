import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { login } from './support/auth'

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

test('plugin demo reuses host navigation and shared shell context with seeded demo routes', async ({ page }) => {
  await login(page, {
    setup: () => useSeededDemoMenu(page)
  })

  await page.getByText(/plugin demo/i).first().click()
  await expect(page).toHaveURL(/\/plugins\/demo$/)
  await page.waitForLoadState('networkidle')

  await expect(page.locator('main')).not.toContainText('p[1] is not a function')
  await expect(page.getByText('Plugin operations lens')).toBeVisible()
  await expect(page.getByText(/route \/plugins\/demo|路由 \/plugins\/demo/)).toBeVisible()
  await expect(page.getByText(/Custom analytics|自定义分析/)).toBeVisible()

  const chart = page.locator('[data-testid="plugin-analytics-chart"]')
  await expect(chart).toBeVisible()

  await page.locator('main').getByRole('button', { name: /插件管理|Plugin management/ }).click()

  await expect(page).toHaveURL(/\/plugins\/management$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/插件管理|Plugin management/)
})
