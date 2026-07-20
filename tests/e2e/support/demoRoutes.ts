import type { Page } from '@playwright/test';

export const demoRoutesMenuResponse = {
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

export async function useSeededDemoMenu(page: Page) {
  await page.route('**/r/SiteMapApi__getSiteMap', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(demoRoutesMenuResponse),
    });
  });
}
