import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the AMIS Prototype Demo.
 *
 * The prototype server plugin only runs in `vite dev` mode (not preview),
 * so this config starts a dev server on port 4176 instead of building + previewing.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4176',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  webServer: {
    command:
      'pnpm --filter @nop-chaos/main exec vite dev --mode amis-prototype --host 127.0.0.1 --port 4176 --strictPort',
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
