import { test } from '@playwright/test';
import { login } from './support/auth';

const fluxEnabledSiteMapResponse = {
  status: 0,
  data: {
    children: [
      {
        id: 'dashboard',
        displayName: 'Dashboard',
        routePath: '/dashboard',
        component: 'dashboard',
        hidden: false,
        meta: { sort: 1 },
      },
      {
        id: 'flux-demo',
        displayName: 'Flux Demo',
        routePath: '/flux-demo',
        component: 'FLUX',
        hidden: false,
        meta: { sort: 7, schemaPath: '/data/flux-demo.json' },
      },
    ],
  },
};

const fluxEnabledMenuResponse = {
  home: '/dashboard',
  items: [
    {
      id: 'dashboard',
      titleKey: 'menu.dashboard',
      path: '/dashboard',
      icon: 'layout-dashboard',
      pageType: 'builtin',
      componentId: 'dashboard',
      sort: 1,
    },
    {
      id: 'flux-demo',
      title: 'Flux Demo',
      path: '/flux-demo',
      icon: 'sparkles',
      pageType: 'flux',
      schemaPath: '/data/flux-demo.json',
      sort: 7,
    },
  ],
};

async function useFluxEnabledMenu(page: import('@playwright/test').Page) {
  await page.route('**/r/SiteMapApi__getSiteMap', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fluxEnabledSiteMapResponse),
    });
  });
  await page.route('**/data/menu-config.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fluxEnabledMenuResponse),
    });
  });
}

test('check button positions', async ({ page }) => {
  await login(page, { setup: () => useFluxEnabledMenu(page) });
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Flux Demo' }).waitFor();
  await page.getByRole('button', { name: 'Flux Demo' }).click();
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    const fa = document.querySelector('[data-slot="form-actions"]');
    if (!fa) return { error: 'no form-actions' };

    const faRect = fa.getBoundingClientRect();
    const faStyle = window.getComputedStyle(fa);

    const chain = [];
    let el = fa.parentElement;
    while (el && chain.length < 8) {
      const r = el.getBoundingClientRect();
      const s = window.getComputedStyle(el);
      chain.push({
        tag: el.tagName,
        className: el.className.substring(0, 80),
        rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) },
        display: s.display,
        justifyContent: s.justifyContent,
        paddingLeft: s.paddingLeft,
        paddingRight: s.paddingRight,
      });
      el = el.parentElement;
    }

    const children = Array.from(fa.children).map((c) => {
      const r = c.getBoundingClientRect();
      return {
        tag: c.tagName,
        text: c.textContent?.trim() || '',
        rect: { left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) },
      };
    });

    return {
      faRect: {
        left: Math.round(faRect.left),
        right: Math.round(faRect.right),
        width: Math.round(faRect.width),
      },
      faStyle: {
        display: faStyle.display,
        justifyContent: faStyle.justifyContent,
        gap: faStyle.gap,
      },
      children,
      parentChain: chain,
    };
  });

  console.log('BUTTON_POS:' + JSON.stringify(data));
  console.log('DONE');
});
