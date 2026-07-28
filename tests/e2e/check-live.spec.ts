import { test } from '@playwright/test';
import { login } from './support/auth';

test.describe('check live (manual debug)', () => {
  test.skip(
    () => !process.env.E2E_RUN_DEBUG_SCRIPTS,
    'Manual debug script — set E2E_RUN_DEBUG_SCRIPTS=1 to run',
  );

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

test('check live page layout', async ({ page }) => {
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

  await page.goto('http://localhost:4173/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Login
  await page.fill('input[placeholder="Username"]', 'nop');
  await page.fill('input[placeholder="Password"]', '123');
  await page.click('button:has-text("Sign in")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Navigate to flux demo
  await page.getByRole('button', { name: 'Flux Demo' }).waitFor();
  await page.getByRole('button', { name: 'Flux Demo' }).click();
  await page.waitForTimeout(3000);

  // Check layout
  const data = await page.evaluate(() => {
    const crud = document.querySelector('.nop-crud');
    if (!crud) return { error: 'no nop-crud' };
    const crudRect = crud.getBoundingClientRect();
    const crudStyle = window.getComputedStyle(crud);

    const children = Array.from(crud.children).map((c) => {
      const r = c.getBoundingClientRect();
      const s = window.getComputedStyle(c);
      return {
        slot: c.getAttribute('data-slot') || c.className.substring(0, 30),
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        mt: s.marginTop,
        mb: s.marginBottom,
        pt: s.paddingTop,
        pb: s.paddingBottom,
      };
    });

    const fa = document.querySelector('[data-slot="form-actions"]');
    let faInfo = null;
    if (fa) {
      const faRect = fa.getBoundingClientRect();
      const faStyle = window.getComputedStyle(fa);
      const btns = Array.from(fa.children).map((b) => ({
        text: b.textContent?.trim() || '',
        left: Math.round(b.getBoundingClientRect().left),
        right: Math.round(b.getBoundingClientRect().right),
      }));
      faInfo = {
        left: Math.round(faRect.left),
        right: Math.round(faRect.right),
        justifyContent: faStyle.justifyContent,
        display: faStyle.display,
        buttons: btns,
      };
    }

    return {
      crudClass: crud.className,
      crudStyle: {
        display: crudStyle.display,
        flexDirection: crudStyle.flexDirection,
        gap: crudStyle.gap,
      },
      gapBetweenQueryAndToolbar:
        children.length >= 2 ? children[1].top - children[0].bottom : 'N/A',
      children,
      formActions: faInfo,
    };
  });

  console.log('LIVE:' + JSON.stringify(data, null, 2));
});
});
