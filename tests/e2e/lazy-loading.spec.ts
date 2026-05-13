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
        id: 'amis-preview',
        displayName: 'Amis Preview',
        routePath: '/amis/preview',
        component: 'AMIS',
        hidden: false,
        url: 'mock://preview',
        meta: { sort: 6 },
      },
      {
        id: 'flux-demo',
        displayName: 'Flux Demo',
        routePath: '/flux-demo',
        component: 'flux-demo',
        hidden: false,
        meta: {
          sort: 7,
          pageType: 'flux',
          schemaPath: 'mock://flux-demo',
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
      id: 'amis-preview',
      title: 'Amis Preview',
      path: '/amis/preview',
      icon: 'workflow',
      pageType: 'amis',
      schemaPath: 'mock://preview',
      sort: 6,
    },
    {
      id: 'flux-demo',
      title: 'Flux Demo',
      path: '/flux-demo',
      icon: 'sparkles',
      pageType: 'flux',
      schemaPath: 'mock://flux-demo',
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

async function waitForRouteRegistration(page: import('@playwright/test').Page, name: string) {
  await expect(page.getByRole('button', { name })).toBeVisible({ timeout: 15_000 });
}

async function openMenuRoute(page: import('@playwright/test').Page, name: string, expectedUrl: RegExp) {
  await waitForRouteRegistration(page, name);
  await page.getByRole('button', { name }).click();
  await expect(page).toHaveURL(expectedUrl);
}

async function getPreloadLinks(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('link[rel=modulepreload], link[rel=preload]')).map(
      (link) => link.href,
    ),
  );
}

async function getAssetResources(page: import('@playwright/test').Page) {
  return page.evaluate(() =>
    performance.getEntriesByType('resource').map((entry) => ({
      name: (entry as PerformanceResourceTiming).name,
      transferSize: (entry as PerformanceResourceTiming).transferSize,
    })),
  );
}

test.describe('AMIS lazy loading optimization', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.waitForLoadState('networkidle');
    await waitForRouteRegistration(page, 'Amis Preview');
  });

  test('AMIS route injects bridge modulepreload links when opened', async ({ page }) => {
    await openMenuRoute(page, 'Amis Preview', /\/amis\/preview$/);
    await expect(page.getByRole('button', { name: 'Trigger host toast' })).toBeVisible({
      timeout: 30_000,
    });

    const amisPreloads = (await getPreloadLinks(page)).filter((href) =>
      /\/assets\/(?:vendor|host)-amis|\/assets\/AmisRouteRenderer-/i.test(href),
    );

    expect(amisPreloads.length).toBeGreaterThan(0);
  });

  test('AMIS route renders after menu registration and loads bridge assets', async ({ page }) => {
    const initialAmisAssets = (await getAssetResources(page)).filter((resource) =>
      /\/assets\/(?:vendor|host)-amis|\/assets\/AmisRouteRenderer-/i.test(resource.name),
    );

    const initialAmisRouteAssets = initialAmisAssets.filter((resource) =>
      /\/assets\/AmisRouteRenderer-/i.test(resource.name),
    );

    expect(initialAmisAssets.length).toBeGreaterThan(0);
    expect(initialAmisRouteAssets).toHaveLength(0);

    await openMenuRoute(page, 'Amis Preview', /\/amis\/preview$/);
    await expect(page.getByRole('button', { name: 'Trigger host toast' })).toBeVisible({
      timeout: 30_000,
    });

    const loadedAmisAssets = (await getAssetResources(page)).filter((resource) =>
      /\/assets\/(?:vendor|host)-amis|\/assets\/AmisRouteRenderer-/i.test(resource.name),
    );

    expect(loadedAmisAssets.length).toBeGreaterThan(0);
    expect(
      loadedAmisAssets.some((resource) => /\/assets\/AmisRouteRenderer-/i.test(resource.name)),
    ).toBe(true);
  });

  test('AMIS bridge chunk transfer size is measurable', async ({ page }) => {
    await openMenuRoute(page, 'Amis Preview', /\/amis\/preview$/);
    await expect(page.getByRole('button', { name: 'Trigger host toast' })).toBeVisible({
      timeout: 30_000,
    });

    const amisChunks = (await getAssetResources(page)).filter(
      (resource) => /amis/i.test(resource.name) && resource.name.endsWith('.js'),
    );

    const vendorChunks = amisChunks.filter(
      (chunk) => chunk.name.includes('vendor-amis') || chunk.name.includes('host-amis'),
    );

    expect(vendorChunks.length).toBeGreaterThan(0);

    const totalVendorSize = vendorChunks.reduce((sum, chunk) => sum + chunk.transferSize, 0);

    console.log(`Total AMIS vendor chunks size: ${(totalVendorSize / 1024).toFixed(2)} KB`);

    expect(totalVendorSize).toBeGreaterThan(0);
  });
});

test.describe('Flux lazy loading optimization', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, { setup: () => useFluxEnabledMenu(page) });
    await page.waitForLoadState('networkidle');
    await waitForRouteRegistration(page, 'Flux Demo');
  });

  test('shell bootstrap does not preload dedicated Flux renderer chunks', async ({ page }) => {
    const fluxRequests = await page.evaluate(() => {
      return performance
        .getEntriesByType('resource')
        .filter((entry) => /FluxRouteRenderer-/i.test((entry as any).name ?? ''));
    });

    expect(fluxRequests).toHaveLength(0);
  });

  test('Flux route loads its renderer chunk and renders seeded schema path', async ({ page }) => {
    const initialResources = await getAssetResources(page);

    const initialFluxChunks = initialResources.filter((resource) =>
      /FluxRouteRenderer-/i.test(resource.name),
    );

    expect(initialFluxChunks).toHaveLength(0);

    await openMenuRoute(page, 'Flux Demo', /\/flux-demo$/);
    await expect(page.getByRole('main')).toContainText('Flux Demo');
    await expect(page.getByRole('main')).toContainText('flux.schemaPath');
    await expect(page.getByRole('main')).not.toContainText('500');

    const newResources = await getAssetResources(page);

    const fluxChunks = newResources.filter((resource) => /FluxRouteRenderer-/i.test(resource.name));

    expect(fluxChunks.length).toBeGreaterThan(0);
  });
});

test.describe('Bundle size validation', () => {
  test('should keep main entry chunk small', async ({ page }) => {
    await login(page);

    const mainEntryChunk = await page.evaluate(() => {
      return performance
        .getEntriesByType('resource')
        .find((entry) => (entry as any).name?.includes('host-entry'));
    });

    expect(mainEntryChunk).toBeDefined();

    const chunkSize = (mainEntryChunk as any).transferSize;

    console.log(`Main entry chunk size: ${(chunkSize / 1024).toFixed(2)} KB`);

    expect(chunkSize).toBeLessThan(50 * 1024);
  });

  test('should validate chunk splitting strategy', async ({ page }) => {
    await login(page);
    await page.goto('/#/dashboard');
    await page.waitForLoadState('networkidle');

    const allChunks = await page.evaluate(() => {
      return performance
        .getEntriesByType('resource')
        .filter((entry) => {
          const name = (entry as any).name;
          return name.endsWith('.js') && name.includes('/assets/');
        })
        .map((entry) => ({
          name: (entry as any).name,
          size: (entry as any).transferSize,
        }));
    });

    const vendorChunks = allChunks.filter((chunk) => chunk.name.includes('vendor-'));
    const hostChunks = allChunks.filter((chunk) => chunk.name.includes('host-'));
    const routeChunks = allChunks.filter(
      (chunk) =>
        chunk.name.includes('page-') ||
        /\/assets\/(dashboard|ai-workbench|flow-editor|settings|help|guide|management|data-management)-/i.test(
          chunk.name,
        ) ||
        /\/assets\/page-secondary-/i.test(chunk.name) ||
        /\/assets\/(?:AppShell|shell-core)-/i.test(chunk.name),
    );

    console.log(`Vendor chunks: ${vendorChunks.length}`);
    console.log(`Host chunks: ${hostChunks.length}`);
    console.log(`Route chunks: ${routeChunks.length}`);

    expect(vendorChunks.length).toBeGreaterThan(0);
    expect(hostChunks.length).toBeGreaterThan(0);
    expect(routeChunks.length).toBeGreaterThan(0);

    const largestVendorChunk = vendorChunks.reduce((max, chunk) =>
      chunk.size > max.size ? chunk : max,
    );

    console.log(
      `Largest vendor chunk: ${largestVendorChunk.name} (${(largestVendorChunk.size / 1024).toFixed(2)} KB)`,
    );

    expect(largestVendorChunk.size).toBeGreaterThan(0);
  });
});
