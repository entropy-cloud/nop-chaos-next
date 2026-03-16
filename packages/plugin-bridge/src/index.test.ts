import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ThemeConfig } from '@nop-chaos/shared'
import { getPluginBridge, getPluginBridgeSnapshot, setPluginBridge, subscribePluginBridge, type PluginBridge } from './index'

const hostKey = '__NOP_PLUGIN_BRIDGE__'
const listenersKey = '__NOP_PLUGIN_BRIDGE_LISTENERS__'

function createBridge(): PluginBridge {
  const themeConfig: ThemeConfig = { themeId: 'classic', displayMode: 'light' }

  return {
    i18n: {
      language: 'en',
      t: (key: string) => key
    } as PluginBridge['i18n'],
    notifications: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn()
    },
    stores: {
      authStore: Object.assign(() => ({ user: null, isAuthenticated: false }), {
        getState: () => ({ user: null, isAuthenticated: false }),
        subscribe: () => () => undefined
      }),
      themeStore: Object.assign(() => ({ themeConfig }), {
        getState: () => ({ themeConfig }),
        subscribe: () => () => undefined
      }),
      pluginStore: Object.assign(() => ({ plugins: [] }), {
        getState: () => ({ plugins: [] }),
        subscribe: () => () => undefined
      })
    },
    navigate: vi.fn(),
    getCurrentUser: () => null,
    getCurrentPath: () => '/dashboard',
    getThemeConfig: () => themeConfig,
    getPluginManifest: () => undefined,
    subscribe: () => () => undefined,
    getSnapshot: () => ({
      i18n: {
        language: 'en',
        t: (key: string) => key
      } as PluginBridge['i18n'],
      themeConfig,
      user: null,
      plugins: []
    })
  }
}

describe('plugin bridge', () => {
  beforeEach(() => {
    delete (globalThis as typeof globalThis & { [hostKey]?: PluginBridge })[hostKey]
    delete (globalThis as typeof globalThis & { [listenersKey]?: Set<() => void> })[listenersKey]
  })

  it('stores and returns the active bridge', () => {
    const bridge = createBridge()

    setPluginBridge(bridge)

    expect(getPluginBridge()).toBe(bridge)
  })

  it('preserves host navigation handlers', () => {
    const bridge = createBridge()

    setPluginBridge(bridge)
    getPluginBridge()?.navigate('/plugins/management', { replace: true })

    expect(bridge.navigate).toHaveBeenCalledWith('/plugins/management', { replace: true })
  })

  it('notifies bridge subscribers when host bridge updates', () => {
    const listener = vi.fn()
    const unsubscribe = subscribePluginBridge(listener)

    setPluginBridge(createBridge())

    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
  })

  it('returns a stable fallback snapshot when bridge is missing', () => {
    const snapshot = getPluginBridgeSnapshot()

    expect(snapshot.themeConfig.themeId).toBe('classic')
    expect(snapshot.user).toBeNull()
    expect(snapshot.plugins).toEqual([])
    expect(snapshot.i18n.t('demo.key')).toBe('demo.key')
  })
})
