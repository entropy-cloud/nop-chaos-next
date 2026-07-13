import { test } from '@playwright/test';

const fluxEnabledSiteMapResponse = {
  status: 0, data: { children: [
    { id: 'dashboard', displayName: 'Dashboard', routePath: '/dashboard', component: 'dashboard', hidden: false, meta: { sort: 1 } },
    { id: 'flux-demo', displayName: 'Flux Demo', routePath: '/flux-demo', component: 'FLUX', hidden: false, meta: { sort: 7, schemaPath: '/data/flux-demo.json' } },
  ]},
};
const fluxEnabledMenuResponse = {
  home: '/dashboard', items: [
    { id: 'dashboard', titleKey: 'menu.dashboard', path: '/dashboard', icon: 'layout-dashboard', pageType: 'builtin', componentId: 'dashboard', sort: 1 },
    { id: 'flux-demo', title: 'Flux Demo', path: '/flux-demo', icon: 'sparkles', pageType: 'flux', schemaPath: '/data/flux-demo.json', sort: 7 },
  ],
};

test('check live 4173', async ({ page }) => {
  const BASE = 'http://localhost:4173';

  // Mock login API
  await page.route(BASE + '/r/LoginApi__login*', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 0, data: { token: 'mock-token' } }) });
  });
  await page.route(BASE + '/r/SiteMapApi__getSiteMap', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fluxEnabledSiteMapResponse) });
  });
  await page.route(BASE + '/data/menu-config.json', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fluxEnabledMenuResponse) });
  });

  await page.goto(BASE + '/#/auth/login');
  await page.waitForTimeout(1000);

  // Fill login form
  const usernameInput = page.locator('input').first();
  const passwordInput = page.locator('input[type="password"]');
  const submitButton = page.locator('button[type="submit"]');

  await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
  await usernameInput.fill('nop');
  await passwordInput.fill('123456');
  await submitButton.click();
  await page.waitForTimeout(2000);

  // Navigate to flux demo
  await page.goto(BASE + '/#/flux-demo');
  await page.waitForTimeout(3000);

  // Check layout
  const data = await page.evaluate(() => {
    const crud = document.querySelector('.nop-crud');
    if (!crud) return { error: 'no nop-crud' };
    const crudStyle = window.getComputedStyle(crud);

    const children = Array.from(crud.children).map(c => {
      const r = c.getBoundingClientRect();
      const s = window.getComputedStyle(c);
      return {
        slot: c.getAttribute('data-slot') || c.className.substring(0, 30),
        top: Math.round(r.top), bottom: Math.round(r.bottom),
        className: c.className.substring(0, 60),
      };
    });

    const fa = document.querySelector('[data-slot="form-actions"]');
    let faInfo = null;
    if (fa) {
      const faRect = fa.getBoundingClientRect();
      const faStyle = window.getComputedStyle(fa);
      const btns = Array.from(fa.children).map(b => ({
        text: b.textContent?.trim() || '',
        left: Math.round(b.getBoundingClientRect().left),
        right: Math.round(b.getBoundingClientRect().right),
        parentRight: Math.round(faRect.right),
      }));
      faInfo = {
        left: Math.round(faRect.left), right: Math.round(faRect.right),
        justifyContent: faStyle.justifyContent, display: faStyle.display,
        buttons: btns,
      };
    }

    return {
      crudClass: crud.className,
      crudStyle: { display: crudStyle.display, flexDirection: crudStyle.flexDirection, gap: crudStyle.gap },
      gapBetweenQueryAndToolbar: children.length >= 2 ? children[1].top - children[0].bottom : 'N/A',
      children,
      formActions: faInfo,
    };
  });

  console.log('LIVE4173:' + JSON.stringify(data));
});
