import { test, expect } from '@playwright/test';
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
        meta: {
          sort: 7,
          schemaPath: '/data/flux-demo.json',
        },
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

test('flux crud layout analysis', async ({ page }) => {
  await login(page, { setup: () => useFluxEnabledMenu(page) });
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Flux Demo' }).waitFor();
  await page.getByRole('button', { name: 'Flux Demo' }).click();
  await expect(page).toHaveURL(/\/flux-demo$/);
  await page.waitForTimeout(2000);

  const main = page.getByRole('main');
  console.log('=== Main content text ===');
  console.log(await main.textContent());

  const crud = page.locator('.nop-crud');
  console.log('nop-crud count:', await crud.count());

  if ((await crud.count()) === 0) {
    console.log('No nop-crud found. Checking all elements with nop- prefix:');
    const allNop = page.locator('[class*="nop-"]');
    console.log('nop-* count:', await allNop.count());
    for (let i = 0; i < Math.min(await allNop.count(), 10); i++) {
      const el = allNop.nth(i);
      const tag = await el.evaluate((el) => el.tagName + '.' + el.className);
      console.log(`  ${i}: ${tag}`);
    }
    return;
  }

  // Check CRUD root element HTML and computed styles
  const crudHtml = await crud.first().evaluate((el) => {
    const s = window.getComputedStyle(el);
    return {
      gap: s.gap,
      display: s.display,
      flexDirection: s.flexDirection,
      className: el.className,
      children: Array.from(el.children).map((c) => ({
        tag: c.tagName,
        className: c.className,
        dataSlot: c.getAttribute('data-slot') || '',
        rect: c.getBoundingClientRect(),
        style: {
          marginTop: window.getComputedStyle(c).marginTop,
          marginBottom: window.getComputedStyle(c).marginBottom,
          paddingTop: window.getComputedStyle(c).paddingTop,
          paddingBottom: window.getComputedStyle(c).paddingBottom,
        },
      })),
    };
  });
  console.log('=== CRUD root ===');
  console.log('className:', crudHtml.className);
  console.log(
    'computed: display=' +
      crudHtml.display +
      ' flex=' +
      crudHtml.flexDirection +
      ' gap=' +
      crudHtml.gap,
  );
  for (const c of crudHtml.children) {
    console.log(
      `[${c.dataSlot || c.className.substring(0, 40)}] top=${Math.round(c.rect.top)} bottom=${Math.round(c.rect.bottom)} mt=${c.style.marginTop} mb=${c.style.marginBottom} pt=${c.style.paddingTop} pb=${c.style.paddingBottom}`,
    );
  }

  // Check query section HTML classes
  const query = page.locator('.nop-crud-query');
  if ((await query.count()) > 0) {
    const qInfo = await query.first().evaluate((el) => {
      const s = window.getComputedStyle(el);
      return { className: el.className, padding: s.padding, marginBottom: s.marginBottom };
    });
    console.log('=== Query section ===');
    console.log('className:', qInfo.className);
    console.log('computed: padding=' + qInfo.padding + ' marginBottom=' + qInfo.marginBottom);
  }

  // Toolbar analysis
  const toolbar = page.locator('.nop-crud-toolbar');
  if ((await toolbar.count()) > 0) {
    const tInfo = await toolbar.first().evaluate((el) => {
      const s = window.getComputedStyle(el);
      return { className: el.className, marginTop: s.marginTop };
    });
    console.log('=== Toolbar ===');
    console.log('className:', tInfo.className);
    console.log('marginTop:', tInfo.marginTop);
  }

  // Check form-actions alignment (search/reset buttons in query form)
  const formActions = page.locator('[data-slot="form-actions"]');
  console.log('form-actions count:', await formActions.count());
  for (let i = 0; i < (await formActions.count()); i++) {
    const faInfo = await formActions.nth(i).evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        className: el.className,
        display: s.display,
        justifyContent: s.justifyContent,
        innerText: el.textContent?.substring(0, 100) || '',
      };
    });
    console.log(`=== form-actions[${i}] ===`);
    console.log(
      `  className: ${faInfo.className} justify: ${faInfo.justifyContent} text: ${faInfo.innerText}`,
    );
  }

  // Open the create form dialog to check its button alignment
  const createBtn = page.getByText('Open create form');
  if ((await createBtn.count()) > 0) {
    await createBtn.click();
    await page.waitForTimeout(500);
    // Check for dialog/modal form-actions
    const dialogActions = page.locator(
      '[role="dialog"] [data-slot="form-actions"], .nop-modal [data-slot="form-actions"], [class*="modal"] [data-slot="form-actions"]',
    );
    const daCount = await dialogActions.count();
    console.log('dialog form-actions count:', daCount);
    for (let i = 0; i < daCount; i++) {
      const daInfo = await dialogActions.nth(i).evaluate((el) => {
        const s = window.getComputedStyle(el);
        return { className: el.className, justifyContent: s.justifyContent, display: s.display };
      });
      console.log(
        `  dialog form-actions[${i}]: class="${daInfo.className}" justify=${daInfo.justifyContent}`,
      );
    }
    // Also check any button bars in dialogs
    const dialogBtns = page.locator('[role="dialog"] button, .nop-modal button');
    console.log('dialog buttons text:', await dialogBtns.allTextContents());
    await page
      .getByLabel('Close')
      .click()
      .catch(() => page.keyboard.press('Escape'));
    await page.waitForTimeout(300);
  }
});
