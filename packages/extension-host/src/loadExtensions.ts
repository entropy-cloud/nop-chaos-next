import type {
  ExtensionModule,
  ExtensionSource,
  LoadExtensionsOptions,
  LoadedExtension,
  ShellExtension
} from '@nop-chaos/shared'
import { resolveSameOriginPath } from '@nop-chaos/shared'

export const DEFAULT_EXTENSION_TIMEOUT_MS = 10_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isShellExtension(value: unknown): value is ShellExtension {
  if (!isRecord(value) || typeof value.id !== 'string' || value.id.length === 0) {
    return false
  }

  if ('setup' in value && value.setup !== undefined && typeof value.setup !== 'function') {
    return false
  }

  if ('supportedLanguages' in value && value.supportedLanguages !== undefined) {
    if (!Array.isArray(value.supportedLanguages)) {
      return false
    }

    if (
      value.supportedLanguages.some(
        (item) => !isRecord(item) || typeof item.code !== 'string' || typeof item.labelKey !== 'string',
      )
    ) {
      return false
    }
  }

  if ('themes' in value && value.themes !== undefined) {
    if (!Array.isArray(value.themes)) {
      return false
    }

    if (
      value.themes.some(
        (item) =>
          !isRecord(item) ||
          typeof item.id !== 'string' ||
          typeof item.labelKey !== 'string' ||
          ('descriptionKey' in item && item.descriptionKey !== undefined && typeof item.descriptionKey !== 'string') ||
          ('cssHref' in item && item.cssHref !== undefined && typeof item.cssHref !== 'string'),
      )
    ) {
      return false
    }
  }

  return true
}

function withTimeout<T>(promise: Promise<T>, sourceId: string, phase: 'load' | 'resolve' | 'setup'): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => {
      reject(new Error(`Extension '${sourceId}' ${phase} timed out after ${DEFAULT_EXTENSION_TIMEOUT_MS}ms`))
    }, DEFAULT_EXTENSION_TIMEOUT_MS)

    promise
      .then((value) => {
        globalThis.clearTimeout(timeoutId)
        resolve(value)
      })
      .catch((error) => {
        globalThis.clearTimeout(timeoutId)
        reject(error)
      })
  })
}

async function resolveExtensionExport(mod: ExtensionModule): Promise<unknown> {
  if (mod.default) {
    return mod.default
  }

  if (mod.extension) {
    return mod.extension
  }

  if (typeof mod.getExtension === 'function') {
    return mod.getExtension()
  }

  return undefined
}

async function loadExtensionModule(source: ExtensionSource): Promise<ExtensionModule> {
  if ('load' in source) {
    return source.load()
  }

  return import(/* @vite-ignore */ resolveSameOriginPath(source.entry).href) as Promise<ExtensionModule>
}

function normalizeExtension(raw: unknown, source: ExtensionSource): ShellExtension {
  if (!isShellExtension(raw)) {
    throw new Error(
      `Extension '${source.id}' must export a valid ShellExtension contract (non-empty 'id' plus valid optional fields)`,
    )
  }

  return raw
}

export async function loadExtensions({
  sources,
  context
}: LoadExtensionsOptions): Promise<LoadedExtension[]> {
  const loaded: LoadedExtension[] = []

  for (const source of sources.filter((item) => item.enabled !== false)) {
    try {
      const mod = await withTimeout(loadExtensionModule(source), source.id, 'load')
      const raw = await withTimeout(resolveExtensionExport(mod), source.id, 'resolve')
      const extension = normalizeExtension(raw, source)

      if (extension.setup) {
        await withTimeout(Promise.resolve(extension.setup(context)), source.id, 'setup')
      }
      loaded.push({ source, extension })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown extension load error'
      context.logger.error(`Failed to load extension '${source.id}': ${message}`)
    }
  }

  return loaded.sort((a, b) => (a.extension.order ?? 0) - (b.extension.order ?? 0))
}
