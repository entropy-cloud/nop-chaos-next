import type { AmisRuntimeAdapter } from '../types'

let runtimeAdapter: AmisRuntimeAdapter | null = null

export function registerAmisRuntimeAdapter(adapter: AmisRuntimeAdapter) {
  runtimeAdapter = adapter
}

export function getAmisRuntimeAdapter() {
  if (!runtimeAdapter) {
    throw new Error('Amis runtime adapter has not been registered')
  }

  return runtimeAdapter
}
