import { defineConfig, devices } from '@playwright/test';

/**
 * E2E for the "extension development without host source" workflow:
 * the built host is served by `vite preview`, a built extension is served
 * from a CORS static server, and `nop-extension-dev dev-in-host` proxies the
 * host while injecting the extension via `window.__NOP_EXTENSIONS__`.
 *
 * Servers are orchestrated by `scripts/e2e-extension-dev-servers.sh`
 * (sequential startup with readiness checks), which the root script
 * `test:e2e:extension-dev` runs after building the host and the extension.
 */

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4176';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: /extension-dev.*\.spec\.ts/,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'line',
  use: {
    baseURL,
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
    command: 'bash scripts/e2e-extension-dev-servers.sh',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 90_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});