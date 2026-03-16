import { getAmisRuntimeAdapter } from '../adapter'
import type { AmisPageObject, AmisSchemaRecord } from '../types'

function isRecord(value: unknown): value is AmisSchemaRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function processActionString(value: string, page: AmisPageObject) {
  const adapter = getAmisRuntimeAdapter()

  if (value.startsWith('@action:')) {
    const actionName = value.slice('@action:'.length).trim()
    const action = page.getAction(actionName) ?? adapter.resolveAction?.(actionName, page)

    if (!action) {
      throw new Error(`Unknown amis action: ${actionName}`)
    }

    page.registerAction(actionName, action)
    return `action://${actionName}`
  }

  if (value.startsWith('@fn:')) {
    const source = value.slice('@fn:'.length).trim()

    if (!adapter.compileFunction) {
      throw new Error('Amis runtime adapter does not support @fn compilation')
    }

    return adapter.compileFunction(source, page)
  }

  return value
}

function bindValue(value: unknown, page: AmisPageObject): unknown {
  if (typeof value === 'string') {
    return processActionString(value, page)
  }

  if (Array.isArray(value)) {
    return value.map((item) => bindValue(item, page))
  }

  if (!isRecord(value)) {
    return value
  }

  const nextValue: AmisSchemaRecord = {}

  for (const [key, childValue] of Object.entries(value)) {
    nextValue[key] = bindValue(childValue, page)
  }

  return nextValue
}

export async function bindActions(schema: unknown, page: AmisPageObject) {
  page.resetActions()
  return bindValue(schema, page)
}
