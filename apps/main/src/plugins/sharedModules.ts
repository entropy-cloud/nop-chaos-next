import * as ReactLib from 'react'
// eslint-disable-next-line no-restricted-imports -- intentional: full module re-exported for plugin system module federation
import * as ReactDOMLib from 'react-dom'
import * as ReactJsxDevRuntimeLib from 'react/jsx-dev-runtime'
import * as ReactJsxRuntimeLib from 'react/jsx-runtime'
import * as ReactQueryLib from '@tanstack/react-query'
import * as ReactRouterDomLib from 'react-router-dom'
import * as ZustandLib from 'zustand'
import * as I18NextLib from 'i18next'
import * as ReactI18NextLib from 'react-i18next'
import * as LucideReactLib from 'lucide-react'
import * as RechartsLib from 'recharts'
import * as SonnerLib from 'sonner'
import * as SharedLib from '@nop-chaos/shared'
import * as PluginBridgeLib from '@nop-chaos/plugin-bridge'
import { registerSharedModules } from '@nop-chaos/core'
import * as UiLib from '@nop-chaos/ui'

declare global {
  var __NOP_SHARED__: Record<string, unknown> | undefined
}

const baseSharedModules = {
  react: ReactLib,
  'react-dom': ReactDOMLib,
  'react/jsx-dev-runtime': ReactJsxDevRuntimeLib,
  'react/jsx-runtime': ReactJsxRuntimeLib,
  'react-router-dom': ReactRouterDomLib,
  zustand: ZustandLib,
  '@tanstack/react-query': ReactQueryLib,
  '@nop-chaos/plugin-bridge': PluginBridgeLib,
  '@nop-chaos/shared': SharedLib,
  '@nop-chaos/ui': UiLib,
  i18next: I18NextLib,
  'react-i18next': ReactI18NextLib,
  'lucide-react': LucideReactLib,
  recharts: RechartsLib,
  sonner: SonnerLib
}

let didRegisterBaseModules = false

export function registerHostSharedModules() {
  globalThis.__NOP_SHARED__ = {
    ...(globalThis.__NOP_SHARED__ ?? {}),
    ...baseSharedModules
  }
}

export function registerBaseSharedModules() {
  registerHostSharedModules()

  if (didRegisterBaseModules) {
    return
  }

  registerSharedModules(baseSharedModules)
  didRegisterBaseModules = true
}

export function ensurePluginSharedModules(): Promise<void> {
  registerBaseSharedModules()
  return Promise.resolve()
}
