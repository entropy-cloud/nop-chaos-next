import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContributionSource, LoadedContribution } from '@nop-chaos/shared'
import { getLanguageOptions } from '../config/i18n/languages'
import { getThemeRegistry } from '../config/themeRegistry'
import { getBuiltinPage } from '../router/pageRegistry'
import { getContributionSources } from './config'
import { loadContributions } from './loadContributions'
import { mergeContributionMenus } from './runtime'

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
    expect(
      mergeContributionMenus({
        home: '/dashboard',
        items: []
      }).items.some((item) => item.componentId === 'contribution-harbor-page' && item.path === '/examples/contribution-harbor')
    ).toBe(true)
    expect(addResourceBundle).toHaveBeenCalled()
    expect(appendedNodes.length).toBeGreaterThan(0)
  })
})
