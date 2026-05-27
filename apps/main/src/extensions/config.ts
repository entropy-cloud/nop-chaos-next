import type { ExtensionSource } from '@nop-chaos/shared'
import { isRelativeOrRootPath } from '@nop-chaos/shared'

type ExtensionHost = typeof globalThis & {
  __NOP_EXTENSIONS__?: ExtensionSource[]
}

function getConfiguredDemoExtensionSource(): ExtensionSource[] {
  const entry = import.meta.env.VITE_DEMO_EXTENSION_ENTRY

  if (!entry || !isRelativeOrRootPath(entry)) {
    return []
  }

  return [
    {
      id: 'demo-shell-extension',
      entry
    }
  ]
}

function getAliasedDemoExtensionSource(): ExtensionSource[] {
  if (!import.meta.env.VITE_DEMO_EXTENSION_ALIAS_PATH) {
    return []
  }

  return [
    {
      id: 'demo-shell-extension',
      load: () => import('@demo-extension')
    }
  ]
}

function isExtensionSource(value: unknown): value is ExtensionSource {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ExtensionSource).id === 'string' &&
    (typeof (value as ExtensionSource & { entry?: unknown }).entry === 'string' ||
      typeof (value as ExtensionSource & { load?: unknown }).load === 'function')
  )
}

function getWindowExtensionSources(): ExtensionSource[] {
  if (typeof window === 'undefined') {
    return []
  }

  const runtimeSources = (globalThis as ExtensionHost).__NOP_EXTENSIONS__

  if (!Array.isArray(runtimeSources)) {
    return []
  }

  return runtimeSources.filter(isExtensionSource)
}

function getDemoExtensionSources(): ExtensionSource[] {
  const configuredSources = getConfiguredDemoExtensionSource()

  if (configuredSources.length > 0) {
    return configuredSources
  }

  const aliasedSources = getAliasedDemoExtensionSource()

  if (aliasedSources.length > 0) {
    return aliasedSources
  }

  if (import.meta.env.VITE_ENABLE_DEMO_EXTENSION !== 'true') {
    return []
  }

  return [
    {
      id: 'demo-shell-extension',
      entry: './demo/index.ts'
    }
  ]
}

export function getExtensionSources(): ExtensionSource[] {
  const runtimeSources = getWindowExtensionSources()

  if (runtimeSources.length > 0) {
    console.info(
      `[extensions] Found ${runtimeSources.length} runtime extension(s):`,
      runtimeSources.map((s) => s.id).join(', ')
    )
    return runtimeSources
  }

  return getDemoExtensionSources()
}
