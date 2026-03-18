import { validateMenuResponse, type MenuResponse } from '@nop-chaos/shared'
import { mergeContributionMenus } from '../../contributions/runtime'
import { wait } from './shared'

export async function fetchMenuConfig(): Promise<MenuResponse> {
  const response = await fetch('/data/menu-config.json', {
    headers: {
      Accept: 'application/json'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to load menu config: ${response.status}`)
  }

  return wait(mergeContributionMenus(validateMenuResponse(await response.json())), 260)
}
