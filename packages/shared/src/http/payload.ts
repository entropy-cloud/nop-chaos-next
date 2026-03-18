export interface ApiPayload<T = unknown> {
  status?: unknown
  msg?: unknown
  data?: T
}

export function isApiPayload(value: unknown): value is ApiPayload {
  return typeof value === 'object' && value !== null && ('status' in value || 'msg' in value || 'data' in value)
}

export function unwrapApiPayload<T>(value: unknown, fallbackMessage = 'Request failed') {
  if (!isApiPayload(value) || !('status' in value)) {
    return value as T
  }

  if (Number(value.status ?? -1) !== 0) {
    throw new Error(typeof value.msg === 'string' && value.msg ? value.msg : fallbackMessage)
  }

  return value.data as T
}
