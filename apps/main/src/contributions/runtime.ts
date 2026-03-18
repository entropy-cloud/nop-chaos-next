import type { LoadedContribution, MenuResponse } from '@nop-chaos/shared'
import { validateMenuResponse } from '@nop-chaos/shared'

let loadedContributions: LoadedContribution[] = []

export function setLoadedContributions(contributions: LoadedContribution[]) {
  loadedContributions = contributions
}

export function getLoadedContributions(): LoadedContribution[] {
  return [...loadedContributions]
}

export function mergeContributionMenus(menuResponse: MenuResponse): MenuResponse {
  const contributedMenus = loadedContributions.flatMap((item) => item.contribution.menus ?? [])

  if (contributedMenus.length === 0) {
    return menuResponse
  }

  return validateMenuResponse({
    ...menuResponse,
    items: [...menuResponse.items, ...contributedMenus],
    home: menuResponse.home ?? contributedMenus[0]?.path ?? '/'
  })
}
