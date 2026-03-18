import type {
  ContributionModule,
  ContributionSource,
  LoadContributionsOptions,
  LoadedContribution,
  ShellContribution
} from '@nop-chaos/shared'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isShellContribution(value: unknown): value is ShellContribution {
  return isRecord(value) && typeof value.id === 'string' && value.id.length > 0
}

async function resolveContributionExport(mod: ContributionModule): Promise<unknown> {
  if (mod.default) {
    return mod.default
  }

  if (mod.contribution) {
    return mod.contribution
  }

  if (typeof mod.getContribution === 'function') {
    return mod.getContribution()
  }

  return undefined
}

function normalizeContribution(raw: unknown, source: ContributionSource): ShellContribution {
  if (!isShellContribution(raw)) {
    throw new Error(`Contribution '${source.id}' must export an object with a non-empty 'id'`)
  }

  return raw
}

export async function loadContributions({
  sources,
  context
}: LoadContributionsOptions): Promise<LoadedContribution[]> {
  const loaded: LoadedContribution[] = []

  for (const source of sources.filter((item) => item.enabled !== false)) {
    try {
      const mod = (await import(/* @vite-ignore */ source.entry)) as ContributionModule
      const raw = await resolveContributionExport(mod)
      const contribution = normalizeContribution(raw, source)

      await contribution.setup?.(context)
      loaded.push({ source, contribution })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown contribution load error'
      context.logger.error(`Failed to load contribution '${source.id}': ${message}`)
    }
  }

  return loaded.sort((a, b) => (a.contribution.order ?? 0) - (b.contribution.order ?? 0))
}
