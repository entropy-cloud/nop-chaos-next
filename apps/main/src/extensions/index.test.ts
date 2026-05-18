import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ExtensionModule, ExtensionSource, LoadedExtension } from '@nop-chaos/shared'
import { loadExtensions, getShellRuntimeConfig, getSystemPageComponentId, mergeExtensionMenus, resolveShellRuntimeConfig, setShellRuntimeConfig } from '@nop-chaos/extension-host'
import { getLanguageOptions } from '../config/i18n/languages'
import { mergeBuiltinSystemMenus } from '../config/systemMenus'
import { getThemeRegistry } from '../config/themeRegistry'
import { getBuiltinPage, getSystemPage } from '../router/pageRegistry'
import { getExtensionSources } from './config'

const { addResourceBundle } = vi.hoisted(() => ({
  addResourceBundle: vi.fn()
}))
const fixtureExtensionEntry = new URL('../../../../examples/extension-demo/src/index.ts', import.meta.url).href

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

const { bootstrapExtensions } = await import('./bootstrap')

function setRuntimeExtensionSources(sources?: ExtensionSource[]) {
  const host = globalThis as typeof globalThis & {
    __NOP_EXTENSIONS__?: ExtensionSource[]
  }

  if (sources) {
    host.__NOP_EXTENSIONS__ = sources
    return
  }

  delete host.__NOP_EXTENSIONS__
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

  // Mock fetch for i18n baseUrl loading
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('/translation.json')) {
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    }
    return new Response(null, { status: 404 })
  }))

  return appendedNodes
}

describe('extension source resolution', () => {
  afterEach(() => {
    setRuntimeExtensionSources()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('prefers runtime window extensions over env fallback', () => {
    stubBrowserGlobals()
    vi.stubEnv('VITE_ENABLE_DEMO_EXTENSION', 'true')
    setRuntimeExtensionSources([
      {
        id: 'runtime-source',
        entry: '/runtime-extension.js'
      }
    ])

    expect(getExtensionSources()).toEqual([
      {
        id: 'runtime-source',
        entry: '/runtime-extension.js'
      }
    ])
  })

  it('falls back to the demo extension source when enabled', () => {
    vi.stubEnv('VITE_ENABLE_DEMO_EXTENSION', 'true')

    const sources = getExtensionSources()

    expect(sources).toHaveLength(1)
    expect(sources[0].id).toBe('demo-shell-extension')

    const source = sources[0]

    if (!('entry' in source)) {
      throw new Error('Expected entry-based extension source')
    }

    expect(source.entry).toBe('./demo/index.ts')
  })

  it('prefers an explicit demo extension entry when configured', () => {
    vi.stubEnv('VITE_DEMO_EXTENSION_ENTRY', '/extensions/demo/index.ts')

    expect(getExtensionSources()).toEqual([
      {
        id: 'demo-shell-extension',
        entry: '/extensions/demo/index.ts'
      }
    ])
  })

  it('ignores protocol-based demo extension entries', () => {
    vi.stubEnv('VITE_DEMO_EXTENSION_ENTRY', 'https://example.com/extension.js')

    expect(getExtensionSources()).toEqual([])
  })

  it('uses the local aliased extension loader when configured', () => {
    vi.stubEnv('VITE_DEMO_EXTENSION_ALIAS_PATH', '../external/extension/index.ts')

    const sources = getExtensionSources()

    expect(sources).toHaveLength(1)
    expect(sources[0].id).toBe('demo-shell-extension')
    expect('load' in sources[0]).toBe(true)

    if (!('load' in sources[0])) {
      throw new Error('Expected local extension loader source')
    }
  })
})

describe('loadExtensions', () => {
  it('loads, normalizes, and sorts esm extensions', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }

    const loaded = await loadExtensions({
      sources: [
        {
          id: 'example-extension-demo',
          load: async () => import(/* @vite-ignore */ fixtureExtensionEntry)
        },
        {
          id: 'demo-shell-extension',
          load: async () => import('./demo/index')
        }
      ],
      context: {
        logger
      }
    })

    expect(loaded).toHaveLength(2)
    expect(loaded.map((item) => item.extension.id)).toEqual([
      'example-extension-demo',
      'demo-shell-extension'
    ])
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('loads extensions from local module loaders', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }

    const loaded = await loadExtensions({
      sources: [
        {
          id: 'loader-extension',
          load: async () => import(/* @vite-ignore */ fixtureExtensionEntry)
        }
      ],
      context: {
        logger
      }
    })

    expect(loaded).toHaveLength(1)
    expect(loaded[0].extension.id).toBe('example-extension-demo')
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs invalid extensions and skips them', async () => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }

    const loaded = await loadExtensions({
      sources: [
        {
          id: 'invalid-extension',
          load: async () => (await import('./fixtures/invalidExtension')) as unknown as ExtensionModule
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

describe('bootstrapExtensions', () => {
  afterEach(() => {
    setRuntimeExtensionSources()
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
        extension: {
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
        extension: {
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

  it('applies the example extension to theme and language registries', async () => {
    const appendedNodes = stubBrowserGlobals()

    setRuntimeExtensionSources([
      {
        id: 'example-extension-demo',
        load: async () => import(/* @vite-ignore */ fixtureExtensionEntry)
      }
    ])

    const loaded = await bootstrapExtensions()

    expect(loaded.map((item: LoadedExtension) => item.extension.id)).toEqual(['example-extension-demo'])
    expect(getLanguageOptions().some((item) => item.code === 'fr-FR')).toBe(true)
    expect(getThemeRegistry().some((item) => item.id === 'harbor')).toBe(true)
    expect(getBuiltinPage('extension-harbor-page')).toBeTypeOf('function')
    expect(getSystemPage('dashboard')).toBe(getBuiltinPage('extension-harbor-page'))
    expect(getSystemPageComponentId('dashboard')).toBe('extension-harbor-page')
    expect(
      mergeExtensionMenus({
        home: '/dashboard',
        items: []
      }).items.some((item) => item.componentId === 'extension-harbor-page' && item.path === '/examples/extension-harbor')
    ).toBe(true)
    expect(mergeBuiltinSystemMenus({ home: '/missing', items: mergeExtensionMenus({ home: '/dashboard', items: [] }).items }).home).toBe('/examples/extension-harbor')
    expect(getShellRuntimeConfig().branding.name).toBe('Harbor Operations Suite')
    expect((globalThis as typeof globalThis & { document?: { title?: string } }).document?.title).toBe('Harbor Operations Suite')
    expect(appendedNodes.length).toBeGreaterThan(0)
    expect(appendedNodes.some((node) => node.rel === 'icon')).toBe(true)
  })

  it('registers shared host modules before loading extensions', async () => {
    const appendedNodes = stubBrowserGlobals()

    setRuntimeExtensionSources([
      {
        id: 'example-extension-demo',
        load: async () => import(/* @vite-ignore */ fixtureExtensionEntry)
      }
    ])

    delete (globalThis as typeof globalThis & { __NOP_SHARED__?: Record<string, unknown> }).__NOP_SHARED__

    await bootstrapExtensions()

    const registry = (globalThis as typeof globalThis & { __NOP_SHARED__?: Record<string, unknown> }).__NOP_SHARED__

    expect(registry).toBeDefined()
    expect(registry?.react).toBeDefined()
    expect(registry?.['react/jsx-runtime']).toBeDefined()
    expect(appendedNodes.length).toBeGreaterThan(0)
  })
})
