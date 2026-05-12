import { test, expect } from '@playwright/test';

test.describe('AMIS lazy loading optimization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should not load AMIS chunks on initial load', async ({ page }) => {
    const amisRequests = await page.evaluate(() => {
      return performance
        .getEntriesByType('resource')
        .filter((entry) => (entry as any).name?.includes('amis'));
    });

    expect(amisRequests).toHaveLength(0);
  });

  test('should load AMIS chunks only when visiting AMIS page', async ({ page }) => {
    const initialResources = await page.evaluate(() =>
      performance.getEntriesByType('resource').map((entry) => (entry as any).name),
    );

    const initialAmisChunks = initialResources.filter(
      (name) => name.includes('vendor-amis') || name.includes('host-amis'),
    );

    expect(initialAmisChunks).toHaveLength(0);

    await page.click('text=AMIS Demo');
    await page.waitForLoadState('networkidle');

    const newResources = await page.evaluate(() =>
      performance.getEntriesByType('resource').map((entry) => (entry as any).name),
    );

    const amisChunks = newResources.filter(
      (name) => name.includes('vendor-amis') || name.includes('host-amis'),
    );

    expect(amisChunks.length).toBeGreaterThan(0);
  });

  test('should only load required AMIS vendor chunks', async ({ page }) => {
    await page.click('text=AMIS Demo');
    await page.waitForLoadState('networkidle');

    const amisChunks = await page.evaluate(() => {
      return performance
        .getEntriesByType('resource')
        .filter((entry) => {
          const name = (entry as any).name;
          return name.includes('amis') && name.endsWith('.js');
        })
        .map((entry) => ({
          name: (entry as any).name,
          size: entry.transferSize,
        }));
    });

    const vendorChunks = amisChunks.filter((chunk) => chunk.name.includes('vendor-amis'));

    expect(vendorChunks.length).toBeGreaterThan(0);

    const totalVendorSize = vendorChunks.reduce((sum, chunk) => sum + chunk.size, 0);

    console.log(`Total AMIS vendor chunks size: ${(totalVendorSize / 1024).toFixed(2)} KB`);

    expect(totalVendorSize).toBeGreaterThan(0);
  });
});

test.describe('Flux lazy loading optimization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should not load Flux chunks on initial load', async ({ page }) => {
    const fluxRequests = await page.evaluate(() => {
      return performance
        .getEntriesByType('resource')
        .filter((entry) => (entry as any).name?.includes('flux'));
    });

    expect(fluxRequests).toHaveLength(0);
  });

  test('should load Flux chunks only when visiting Flux page', async ({ page }) => {
    const initialResources = await page.evaluate(() =>
      performance.getEntriesByType('resource').map((entry) => (entry as any).name),
    );

    const initialFluxChunks = initialResources.filter((name) => name.includes('flux'));

    expect(initialFluxChunks).toHaveLength(0);

    await page.goto('/flux-demo');
    await page.waitForLoadState('networkidle');

    const newResources = await page.evaluate(() =>
      performance.getEntriesByType('resource').map((entry) => (entry as any).name),
    );

    const fluxChunks = newResources.filter((name) => name.includes('flux'));

    expect(fluxChunks.length).toBeGreaterThan(0);
  });
});

test.describe('Bundle size validation', () => {
  test('should keep main entry chunk small', async ({ page, request }) => {
    await page.goto('/');

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
    await page.goto('/');
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
    const pageChunks = allChunks.filter((chunk) => chunk.name.includes('page-'));

    console.log(`Vendor chunks: ${vendorChunks.length}`);
    console.log(`Host chunks: ${hostChunks.length}`);
    console.log(`Page chunks: ${pageChunks.length}`);

    expect(vendorChunks.length).toBeGreaterThan(0);
    expect(hostChunks.length).toBeGreaterThan(0);
    expect(pageChunks.length).toBeGreaterThan(0);

    const largestVendorChunk = vendorChunks.reduce((max, chunk) =>
      chunk.size > max.size ? chunk : max,
    );

    console.log(
      `Largest vendor chunk: ${largestVendorChunk.name} (${(largestVendorChunk.size / 1024).toFixed(2)} KB)`,
    );

    expect(largestVendorChunk.size).toBeGreaterThan(0);
  });
});
