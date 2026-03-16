import { getAmisRuntimeAdapter, type AmisPageObject, type AmisRequestOptions } from '@nop-chaos/amis-core'

function normalizeMessage(value: unknown) {
  if (typeof value === 'string') {
    return value
  }

  if (value instanceof Error) {
    return value.message
  }

  return 'Unknown amis runtime message'
}

async function runRequest(options: AmisRequestOptions) {
  const adapter = getAmisRuntimeAdapter()
  const request = adapter.processRequest ? adapter.processRequest(options) : options

  if (request.url.startsWith('dict://')) {
    return adapter.dictProvider.getDict(request.url.slice('dict://'.length), request)
  }

  if (request.url.startsWith('page://')) {
    const schema = await adapter.pageProvider.getPage(request.url.slice('page://'.length))
    return {
      status: 200,
      data: {
        status: 0,
        msg: '',
        data: schema
      }
    }
  }

  if (request.url.startsWith('action://')) {
    const actionName = request.url.slice('action://'.length)
    const action = options._page?.getAction(actionName)

    if (!action) {
      throw new Error(`Unknown amis action: ${actionName}`)
    }

    const result = await Promise.resolve(action(request, options._page))

    if (result && typeof result === 'object' && 'status' in result && 'data' in result) {
      return result
    }

    return {
      status: 200,
      data: {
        status: 0,
        msg: '',
        data: result ?? null
      }
    }
  }

  const method = request.method ?? (request.data === undefined ? 'get' : 'post')
  const response = await fetch(request.url, {
    method: method.toUpperCase(),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...request.headers
    },
    body: method.toLowerCase() === 'get' ? undefined : request.data === undefined ? undefined : JSON.stringify(request.data)
  })

  const data = request.responseType === 'blob' ? await response.blob() : await response.json()
  return {
    status: response.status,
    data
  }
}

export function createAmisEnv(page: AmisPageObject) {
  const adapter = getAmisRuntimeAdapter()

  return {
    session: page.id,
    fetcher: (options: AmisRequestOptions) => {
      const task = runRequest({ ...options, _page: page })
      return adapter.processResponse ? adapter.processResponse(task) : task
    },
    jumpTo: (to: string) => {
      adapter.navigate(to)
    },
    updateLocation: (to: string, replace?: boolean) => {
      adapter.navigate(to, { replace: Boolean(replace) })
    },
    isCurrentUrl: (to: string) => adapter.isCurrentUrl(to),
    notify: (type: 'info' | 'success' | 'error' | 'warning', message: unknown) => {
      adapter.notify(type, normalizeMessage(message))
    },
    alert: (message: string, title?: string) => adapter.alert(message, title),
    confirm: (message: string, title?: string) => adapter.confirm(message, title),
    copy: async (content: string) => {
      await navigator.clipboard.writeText(content)
      adapter.notify('success', 'Copied to clipboard')
      return true
    },
    _page: page
  }
}
