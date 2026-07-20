import type { Page } from '@playwright/test';

export async function setupFluxCrudApiInterception(page: Page): Promise<void> {
  await page.route('**/api/flux-demo**', async (route) => {
    const method = route.request().method().toUpperCase();
    if (method === 'POST' || method === 'PUT') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 0, data: { id: Date.now() } }),
      });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
  });
}
