import { expect } from '@playwright/test';
import { test, mockLogin as login } from '@nop-chaos/e2e-shared';

/**
 * Validates the extension-development-without-host-source loop end to end:
 *
 *   built host (`vite preview`, mock APIs)
 *     < proxied by `dev-in-host` which injects `window.__NOP_EXTENSIONS__`
 *         pointing at the CORS-served built extension on 4180
 *
 * The browser only talks to the proxy (4176) — no host source involved.
 */

test('built host exposes its API version and loads the injected cross-origin extension', async ({
  page,
}) => {
  await page.goto('/');

  // The host publishes its API contract on a runtime global.
  await expect
    .poll(() => page.evaluate(() => (window as unknown as Record<string, unknown>).__NOP_HOST_API_VERSION__))
    .toMatch(/^\d+\.\d+\.\d+$/);

  // Rendering engines (flux / amis) are registered as shared modules —
  // extensions must consume the host instances.
  const engines = await page.evaluate(() => {
    const registry = (window as unknown as { __NOP_SHARED__?: Record<string, unknown> }).__NOP_SHARED__;
    return {
      flux: registry?.['@nop-chaos/flux'],
      amisCore: registry?.['amis-core'],
      amis: registry?.['amis'],
    };
  });
  expect(engines.flux).toBeDefined();
  expect(engines.amisCore).toBeDefined();
  expect(engines.amis).toBeDefined();

  // The injected extension replaces the login page (harbor variant) — proof
  // the extension module was actually loaded through the proxy injection.
  const loginVariant = await login(page);
  expect(loginVariant).toBe('harbor');

  await expect(page).toHaveURL(/#\/dashboard$/);

  // The extension registered a builtin page; navigate to it directly.
  await page.goto('/#/examples/extension-harbor');
  await expect(page.getByText('Extension Builtin Page')).toBeVisible();
  await expect(page.getByText('How it works')).toBeVisible();
});

test('built extension ships a valid extension.json deploy manifest', async () => {
  const response = await fetch('http://127.0.0.1:4180/extension.json');
  expect(response.status).toBe(200);

  const manifest = (await response.json()) as {
    id: string;
    name: string;
    entry: string;
    styleAssets?: string[];
    assets?: string[];
  };

  expect(manifest.id).toBe('example-extension-demo');
  expect(manifest.name).toBe('Harbor Operations Suite');
  expect(manifest.entry).toMatch(/^\.\/assets\/.*\.js$/);
  expect(manifest.styleAssets?.length).toBeGreaterThan(0);
  expect(manifest.assets ?? []).toContainEqual(expect.stringMatching(/\.svg$/));
});