import { isMockEnabled } from '../../config/env'
import { getStorageItem, setStorageItem } from '../../utils/storage'

const mockEnabled = isMockEnabled()

export function clone<T>(value: T): T {
  return structuredClone(value)
}

export function wait<T>(value: T, ms = 240): Promise<T> {
  return new Promise((resolve) => {
    globalThis.setTimeout(() => resolve(value), mockEnabled ? ms : 0)
  })
}

export function readStoredJson<T>(key: string, fallback: T): T {
  const raw = getStorageItem(key)
  if (!raw) {
    return clone(fallback)
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return clone(fallback)
  }
}

export function writeStoredJson<T>(key: string, value: T): void {
  setStorageItem(key, JSON.stringify(value))
}
