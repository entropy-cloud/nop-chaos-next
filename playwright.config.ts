import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4175'
const useExternalServer = Boolean(process.env.PLAYWRIGHT_BASE_URL)

const rootDir = dirname(fileURLToPath(import.meta.url))

function loadMockEnv() {
  if (useExternalServer) {
    return {}
  }

  const envPath = resolve(rootDir, 'apps/main/.env.mock')
  let fileContent = ''

  try {
    fileContent = readFileSync(envPath, 'utf8')
  } catch {
    return {}
  }

  const env: Record<string, string> = {}

  for (const line of fileContent.split(/\r?\n/)) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const index = trimmed.indexOf('=')

    if (index <= 0) {
      continue
    }

    const key = trimmed.slice(0, index).trim()
    const value = trimmed.slice(index + 1).trim()

    if (key) {
      env[key] = value
    }
  }

  return env
}

const webServerEnv = loadMockEnv()

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome']
      }
    }
  ],
  webServer: useExternalServer
    ? undefined
    : {
        command: 'pnpm --filter @nop-chaos/main exec vite build --mode mock && pnpm --filter @nop-chaos/main exec vite preview --mode mock --host 127.0.0.1 --port 4175 --strictPort',
        url: 'http://127.0.0.1:4175',
        env: webServerEnv,
        reuseExistingServer: false,
        timeout: 180_000
      }
})
