import { isMockEnabled } from '../config/env'
import { ajaxFetch, ajaxQuery } from './http'
import { loadSchemaAsset } from './schemaAsset'

export async function fetchAmisPage(schemaPath: string) {
  if (isMockEnabled() || schemaPath.startsWith('/mock') || schemaPath.endsWith('.json')) {
    return loadSchemaAsset(schemaPath)
  }

  if (schemaPath.startsWith('/p/')) {
    return ajaxFetch<unknown>(schemaPath, {
      method: 'GET'
    })
  }

  return ajaxQuery<unknown>('@query:PageProvider__getPage', {
    path: schemaPath
  })
}
