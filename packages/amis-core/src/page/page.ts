import { getAmisRuntimeAdapter } from '../adapter'
import type { AmisAction, AmisPageObject } from '../types'

function createPageId() {
  return `amis-page-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createAmisPageObject(schemaPath?: string): AmisPageObject {
  const actions = new Map<string, AmisAction>()
  const state = new Map<string, unknown>()

  const getAction = (name: string) => {
    const registeredAction = actions.get(name)

    if (registeredAction) {
      return registeredAction
    }

    const resolvedAction = getAmisRuntimeAdapter().resolveAction?.(name, page)

    if (resolvedAction) {
      actions.set(name, resolvedAction)
    }

    return resolvedAction
  }

  const page: AmisPageObject = {
    id: createPageId(),
    schemaPath,
    registerAction: (name, action) => {
      actions.set(name, action)
    },
    getAction,
    resetActions: () => {
      actions.clear()
    },
    getComponent: () => undefined,
    getScopedStore: () => undefined,
    getState: (name) => state.get(name),
    setState: (name, value) => {
      state.set(name, value)
    },
    destroy: () => {
      actions.clear()
      state.clear()
    }
  }

  return page
}
