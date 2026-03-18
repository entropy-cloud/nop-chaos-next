import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContributionSource, LoadedContribution } from '@nop-chaos/shared'
import { getLanguageOptions } from '../config/i18n/languages'
import { mergeBuiltinSystemMenus } from '../config/systemMenus'
import { getThemeRegistry } from '../config/themeRegistry'
import { getBuiltinPage, getSystemPage } from '../router/pageRegistry'
import { getContributionSources } from './config'
import { loadContributions } from './loadContributions'
import { getShellRuntimeConfig, getSystemPageComponentId, mergeContributionMenus, resolveShellRuntimeConfig, setShellRuntimeConfig } from './runtime'

const addResourceBundle = vi.fn()

vi.mock('../config/i18n', async () => {
  return {
    default: {
      addResourceBundle
    },
    initializeI18n: vi.fn(async () => ({
      addResourceBundle
    }))
  }
})

const { bootstrapContributions } = await import('./bootstrap')

function setRuntimeContributionSources(sources?: ContributionSource[]) {
  const host = globalThis as typeof globalThis & {
    __NOP_CONTRIBUTIONS__?: ContributionSource[]
  }

  if (sources) {
    host.__NOP_CONTRIBUTIONS__ = sources
    return
  }

  delete host.__NOP_CONTRIBUTIONS__
}

function stubBrowserGlobals() {
  const windowStub = globalThis as typeof globalThis & Window
  const appendedNodes: Array<{ href?: string; rel?: string; dataset?: Record<string, string> }> = []

  vi.stubGlobal('window', windowStub)
  vi.stubGlobal('document', {
    title: '',
    querySelector: vi.fn(() => null),
    createElement: vi.fn(() => ({
      rel: '',
      href: '',
      dataset: {} as Record<string, string>
    })),
    head: {
      append: vi.fn((node: { href?: string; rel?: string; dataset?: Record<string, string> }) => {
        appendedNodes.push(node)
      })
    }
  })

  return appendedNodes
}

describe('contribution source resolution', () => {
  afterEach(() => {
    setRuntimeContributionSources()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('prefers runtime window contributions over env fallback', () => {
    stubBrowserGlobals()
    vi.stubEnv('VITE_ENABLE_DEMO_CONTRIBUTION', 'true')
    setRuntimeContributionSources([
      {
        id: 'runtime-source',
        entry: 'https://example.com/runtime-contribution.js'
      }
    ])

    expect(getContributionSources()).toEqual([
      {
        id: 'runtime-source',
        entry: 'https://example.com/runtime-contribution.js'
      }
    ])
  })

  it('falls back to the demo contribution source when enabled', () => {
    vi.stubEnv('VITE_ENABLE_DEMO_CONTRIBUTION', 'true')

    const sources = getContributionSources()

    expect(sources).toHaveLength(1)
    expect(sources[0].id).toBe('demo-shell-contribution')
    expect(sources[0].entry).toContain('/contributions/demo/index.ts')
  })

  it('prefers an explicit demo contribution entry when configured', () => {
    vi.stubEnv('VITE_DEMO_CONTRIBUTION_ENTRY', 'http://127.0.0.1:4180/src/index.ts')

    expect(getContributionSources()).toEqual([
      {
        id: 'demo-shell-contribution',
        entry: 'http://127.0.0.1:4180/src/index.ts'
      }
    ])
  })
})

describe('loadContributions', () => {
  it('loads, normalizes, and sorts esm contributions', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }

    const loaded = await loadContributions({
      sources: [
        {
          id: 'example-contribution-demo',
          entry: new URL('../../../../examples/contribution-demo/src/index.ts', import.meta.url).href
        },
        {
          id: 'demo-shell-contribution',
          entry: new URL('./demo/index.ts', import.meta.url).href
        }
      ],
      context: {
        logger
      }
    })

    expect(loaded).toHaveLength(2)
    expect(loaded.map((item) => item.contribution.id)).toEqual([
      'example-contribution-demo',
      'demo-shell-contribution'
    ])
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs invalid contributions and skips them', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }

    const loaded = await loadContributions({
      sources: [
        {
          id: 'invalid-contribution',
          entry: new URL('./fixtures/invalidContribution.ts', import.meta.url).href
        }
      ],
      context: {
        logger
      }
    })

    expect(loaded).toEqual([])
    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})

describe('bootstrapContributions', () => {
  afterEach(() => {
    setRuntimeContributionSources()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    addResourceBundle.mockReset()
    setShellRuntimeConfig(resolveShellRuntimeConfig([]))
    delete (globalThis as typeof globalThis & { __NOP_SHARED__?: Record<string, unknown> }).__NOP_SHARED__
  })

  it('resolves shell runtime config from legacy app fields and new overrides', () => {
    const resolved = resolveShellRuntimeConfig([
      {
        source: { id: 'base', entry: 'https://example.com/base.js' },
        contribution: {
          id: 'base',
          order: 10,
          app: {
            name: 'Legacy Shell',
            shortName: 'Legacy',
            logoUrl: 'https://example.com/legacy-logo.svg',
            defaultHomePath: '/legacy-home'
          }
        }
      },
      {
        source: { id: 'override', entry: 'https://example.com/override.js' },
        contribution: {
          id: 'override',
          order: 20,
          branding: {
            name: 'Harbor Ops',
            shortName: 'Harbor',
            documentTitle: 'Harbor Console',
            faviconUrl: 'https://example.com/favicon.ico'
          },
          loginUi: {
            heroTitleKey: 'demo.heroTitle',
            features: [
              {
                titleKey: 'demo.feature.title',
                descriptionKey: 'demo.feature.description'
              }
            ],
            showDemoHint: false
          },
          shell: {
            defaultHomePath: '/harbor-home'
          },
          systemPages: {
            login: 'custom-login'
          }
        }
      }
    ])

    expect(resolved.branding).toEqual({
      name: 'Harbor Ops',
      shortName: 'Harbor',
      logoUrl: 'https://example.com/legacy-logo.svg',
      documentTitle: 'Harbor Console',
      faviconUrl: 'https://example.com/favicon.ico',
      markUrl: undefined
    })
    expect(resolved.loginUi.heroTitleKey).toBe('demo.heroTitle')
    expect(resolved.loginUi.showDemoHint).toBe(false)
    expect(resolved.loginUi.features).toEqual([
      {
        titleKey: 'demo.feature.title',
        descriptionKey: 'demo.feature.description'
      }
    ])
    expect(resolved.shell.defaultHomePath).toBe('/harbor-home')
    expect(resolved.systemPages.login).toBe('custom-login')
  })

  it('applies the example contribution to theme and language registries', async () => {
    const appendedNodes = stubBrowserGlobals()

    setRuntimeContributionSources([
      {
        id: 'example-contribution-demo',
        entry: new URL('../../../../examples/contribution-demo/src/index.ts', import.meta.url).href
      }
    ])

    const loaded = await bootstrapContributions()

    expect(loaded.map((item: LoadedContribution) => item.contribution.id)).toEqual(['example-contribution-demo'])
    expect(getLanguageOptions().some((item) => item.code === 'fr-FR')).toBe(true)
    expect(getThemeRegistry().some((item) => item.id === 'harbor')).toBe(true)
    expect(getBuiltinPage('contribution-harbor-page')).toBeTypeOf('function')
    expect(getSystemPage('dashboard')).toBe(getBuiltinPage('contribution-harbor-page'))
    expect(getSystemPageComponentId('dashboard')).toBe('contribution-harbor-page')
    expect(
      mergeContributionMenus({
        home: '/dashboard',
        items: []
      }).items.some((item) => item.componentId === 'contribution-harbor-page' && item.path === '/examples/contribution-harbor')
    ).toBe(true)
    expect(mergeBuiltinSystemMenus({ home: '/missing', items: mergeContributionMenus({ home: '/dashboard', items: [] }).items }).home).toBe('/examples/contribution-harbor')
    expect(getShellRuntimeConfig().branding.name).toBe('Harbor Operations Suite')
    expect((globalThis as typeof globalThis & { document?: { title?: string } }).document?.title).toBe('Harbor Operations Suite')
    expect(addResourceBundle).toHaveBeenCalled()
    expect(appendedNodes.length).toBeGreaterThan(0)
    expect(appendedNodes.some((node) => node.rel === 'icon')).toBe(true)
  })

  it('registers shared host modules before loading contributions', async () => {
    const appendedNodes = stubBrowserGlobals()

    setRuntimeContributionSources([
      {
        id: 'example-contribution-demo',
        entry: new URL('../../../../examples/contribution-demo/src/index.ts', import.meta.url).href
      }
    ])

    delete (globalThis as typeof globalThis & { __NOP_SHARED__?: Record<string, unknown> }).__NOP_SHARED__

    await bootstrapContributions()

    const registry = (globalThis as typeof globalThis & { __NOP_SHARED__?: Record<string, unknown> }).__NOP_SHARED__

    expect(registry).toBeDefined()
    expect(registry?.react).toBeDefined()
    expect(registry?.['react/jsx-runtime']).toBeDefined()
    expect(appendedNodes.length).toBeGreaterThan(0)
  })
})
