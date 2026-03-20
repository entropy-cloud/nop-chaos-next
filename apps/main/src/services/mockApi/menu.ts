import { validateMenuResponse, type MenuResponse } from '@nop-chaos/shared'
import { mergeExtensionMenus } from '../../extensions/runtime'
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

  return wait(mergeExtensionMenus(validateMenuResponse(await response.json())), 260)
}
