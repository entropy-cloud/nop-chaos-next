import { getAmisRuntimeAdapter } from '../adapter'
import type { AmisSchemaRecord } from '../types'
import { processSchemaValue } from './processor'

function normalizeRoles(value: unknown) {
  if (typeof value !== 'string') {
    return []
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function transformPageJson(schema: unknown) {
  const adapter = getAmisRuntimeAdapter()

  return processSchemaValue(schema, {
    onObject: (value: AmisSchemaRecord) => {
      const roles = normalizeRoles(value['xui:roles'])

      if (roles.length > 0 && !roles.some((role) => adapter.hasRole(role))) {
        return null
      }

      if (!('xui:roles' in value)) {
        return value
      }

      const nextValue = { ...value }
      delete nextValue['xui:roles']
      return nextValue
    }
  })
}
