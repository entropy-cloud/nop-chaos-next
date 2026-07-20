import type { PageTransformerRegistration, PageTransformerContext } from '@nop-chaos/shared'

const registry: PageTransformerRegistration[] = []

export function registerPageTransformer(registration: PageTransformerRegistration): void {
  const order = registration.order ?? 100
  let insertIndex = registry.length

  for (let i = 0; i < registry.length; i++) {
    const existingOrder = registry[i].order ?? 100
    if (order < existingOrder) {
      insertIndex = i
      break
    }
  }

  registry.splice(insertIndex, 0, registration)
}

export function unregisterPageTransformer(id: string): void {
  const index = registry.findIndex((r) => r.id === id)
  if (index !== -1) {
    registry.splice(index, 1)
  }
}

export function getPageTransformers(): ReadonlyArray<PageTransformerRegistration> {
  return [...registry] as ReadonlyArray<PageTransformerRegistration>
}

export function clearPageTransformers(): void {
  registry.length = 0
}

export async function applyPageTransformers<T>(
  schema: T,
  context: PageTransformerContext,
): Promise<T> {
  let current: unknown = schema

  for (const registration of registry) {
    try {
      const result = await registration.transform(current as Record<string, unknown>, context)
      if (result !== undefined) {
        current = result
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[pageTransformer] transformer "${registration.id}" skipped: ${message}`)
    }
  }

  return current as T
}
