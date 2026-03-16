import { useSyncExternalStore } from 'react'
import type { i18n } from 'i18next'
import type { PluginManifest, ThemeConfig, User } from '@nop-chaos/shared'

export interface BridgeSnapshot {
  i18n: i18n
  themeConfig: ThemeConfig
  user: User | null
  plugins: PluginManifest[]
}

type BoundStore<T> = {
  (): T
  <U>(selector: (state: T) => U): U
  getState: () => T
  subscribe: (listener: () => void) => () => void
}

export interface PluginBridgeStores {
  authStore: BoundStore<{
    user: User | null
    isAuthenticated: boolean
    token?: string
  }>
  themeStore: BoundStore<{
    themeConfig: ThemeConfig
  }>
  pluginStore: BoundStore<{
    plugins: PluginManifest[]
  }>
}

export interface PluginBridgeNotifications {
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

export interface PluginBridgeNavigateOptions {
  replace?: boolean
  state?: unknown
}

export interface PluginBridge {
  i18n: i18n
  notifications: PluginBridgeNotifications
  stores: PluginBridgeStores
  navigate: (to: string, options?: PluginBridgeNavigateOptions) => void
  getCurrentUser: () => User | null
  getCurrentPath: () => string
  getThemeConfig: () => ThemeConfig
  getPluginManifest: (pluginId: string) => PluginManifest | undefined
  subscribe: (listener: () => void) => () => void
  getSnapshot: () => BridgeSnapshot
}

const BRIDGE_KEY = '__NOP_PLUGIN_BRIDGE__'
const BRIDGE_LISTENERS_KEY = '__NOP_PLUGIN_BRIDGE_LISTENERS__'
const FALLBACK_THEME_CONFIG: ThemeConfig = { themeId: 'classic', displayMode: 'light' }

const fallbackI18n = {
  language: 'en',
  t: (key: string) => key
} as i18n

const fallbackSnapshot: BridgeSnapshot = {
  i18n: fallbackI18n,
  themeConfig: FALLBACK_THEME_CONFIG,
  user: null,
  plugins: []
}

function getHost() {
  return globalThis as typeof globalThis & {
    [BRIDGE_KEY]?: PluginBridge
    [BRIDGE_LISTENERS_KEY]?: Set<() => void>
  }
}

function getListeners() {
  const host = getHost()
  host[BRIDGE_LISTENERS_KEY] ??= new Set()
  return host[BRIDGE_LISTENERS_KEY]
}

export function setPluginBridge(bridge: PluginBridge) {
  getHost()[BRIDGE_KEY] = bridge
  for (const listener of getListeners()) {
    listener()
  }
}

export function getPluginBridge(): PluginBridge | undefined {
  return getHost()[BRIDGE_KEY]
}

export function subscribePluginBridge(listener: () => void): () => void {
  const listeners = getListeners()
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

function subscribeBridgeSnapshot(listener: () => void): () => void {
  const unsubscribeBridge = subscribePluginBridge(listener)
  const unsubscribeSnapshot = getPluginBridge()?.subscribe(listener) ?? (() => undefined)

  return () => {
    unsubscribeSnapshot()
    unsubscribeBridge()
  }
}

export function getPluginBridgeSnapshot(): BridgeSnapshot {
  return getPluginBridge()?.getSnapshot() ?? fallbackSnapshot
}

export function usePluginBridge(): PluginBridge | undefined {
  return useSyncExternalStore(subscribePluginBridge, getPluginBridge, getPluginBridge)
}

export function usePluginBridgeSnapshot(): BridgeSnapshot {
  return useSyncExternalStore(subscribeBridgeSnapshot, getPluginBridgeSnapshot, getPluginBridgeSnapshot)
}

export function usePluginThemeConfig(): ThemeConfig {
  return usePluginBridgeSnapshot().themeConfig
}

export function usePluginUser(): User | null {
  return usePluginBridgeSnapshot().user
}

export function usePluginManifest(pluginId: string): PluginManifest | undefined {
  return usePluginBridgeSnapshot().plugins.find((plugin) => plugin.id === pluginId)
}

export function usePluginI18n(): i18n {
  return usePluginBridgeSnapshot().i18n
}

export function usePluginNotifications(): PluginBridgeNotifications {
  return usePluginBridge()?.notifications ?? {
    success: () => undefined,
    error: () => undefined,
    info: () => undefined
  }
}
