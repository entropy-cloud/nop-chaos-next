import type { ContributionSource } from '@nop-chaos/shared'

type ContributionHost = typeof globalThis & {
  __NOP_CONTRIBUTIONS__?: ContributionSource[]
}

function getConfiguredDemoContributionSource(): ContributionSource[] {
  const entry = import.meta.env.VITE_DEMO_CONTRIBUTION_ENTRY

  if (!entry) {
    return []
  }

  return [
    {
      id: 'demo-shell-contribution',
      entry
    }
  ]
}

function isContributionSource(value: unknown): value is ContributionSource {
  return typeof value === 'object' && value !== null && typeof (value as ContributionSource).id === 'string' && typeof (value as ContributionSource).entry === 'string'
}

function getWindowContributionSources(): ContributionSource[] {
  if (typeof window === 'undefined') {
    return []
  }

  const runtimeSources = (globalThis as ContributionHost).__NOP_CONTRIBUTIONS__

  if (!Array.isArray(runtimeSources)) {
    return []
  }

  return runtimeSources.filter(isContributionSource)
}

function getDemoContributionSources(): ContributionSource[] {
  const configuredSources = getConfiguredDemoContributionSource()

  if (configuredSources.length > 0) {
    return configuredSources
  }

  if (import.meta.env.VITE_ENABLE_DEMO_CONTRIBUTION !== 'true') {
    return []
  }

  return [
    {
      id: 'demo-shell-contribution',
      entry: new URL('./demo/index.ts', import.meta.url).href
    }
  ]
}

export function getContributionSources(): ContributionSource[] {
  const runtimeSources = getWindowContributionSources()

  if (runtimeSources.length > 0) {
    return runtimeSources
  }

  return getDemoContributionSources()
}
