import type {
  ExtensionModule,
  ExtensionSource,
  LoadExtensionsOptions,
  LoadedExtension,
  ShellExtension
} from '@nop-chaos/shared'
import { resolveSameOriginPath } from '@nop-chaos/shared'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isShellExtension(value: unknown): value is ShellExtension {
  return isRecord(value) && typeof value.id === 'string' && value.id.length > 0
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
    throw new Error(`Extension '${source.id}' must export an object with a non-empty 'id'`)
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
      const mod = await loadExtensionModule(source)
      const raw = await resolveExtensionExport(mod)
      const extension = normalizeExtension(raw, source)

      await extension.setup?.(context)
      loaded.push({ source, extension })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown extension load error'
      context.logger.error(`Failed to load extension '${source.id}': ${message}`)
    }
  }

  return loaded.sort((a, b) => (a.extension.order ?? 0) - (b.extension.order ?? 0))
}
