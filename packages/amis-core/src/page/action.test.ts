import { describe, expect, it } from 'vitest'
import { registerAmisRuntimeAdapter } from '../adapter'
import { bindActions } from './action'
import { createAmisPageObject } from './page'

describe('bindActions', () => {
  it('converts @action strings into action urls', async () => {
    const page = createAmisPageObject('mock://preview')

    registerAmisRuntimeAdapter({
      getI18n: () => ({}) as never,
      getLocale: () => 'en-US',
      getCurrentUser: () => null,
      getAuthToken: () => undefined,
      setAuthToken: () => undefined,
      hasRole: () => false,
      getThemeConfig: () => ({ themeId: 'classic', displayMode: 'light' }),
      navigate: () => undefined,
      isCurrentUrl: () => false,
      notify: () => undefined,
      alert: async () => undefined,
      confirm: async () => true,
      logout: () => undefined,
      pageProvider: { getPage: async () => ({}) },
      dictProvider: { getDict: async () => ({ status: 200, data: { status: 0, msg: '', data: [] } }) },
      resolveAction: (name: string) => (name === 'preview.notify' ? () => 'ok' : undefined),
      compileFunction: (code, currentPage) => new Function('page', `return (${code})`)(currentPage) as Function
    })

    const bound = await bindActions(
      {
        type: 'button',
        api: '@action:preview.notify'
      },
      page
    )

    expect(bound).toMatchObject({ api: 'action://preview.notify' })
    expect(page.getAction('preview.notify')).toBeTypeOf('function')
  })

  it('compiles @fn expressions into callable functions', async () => {
    const page = createAmisPageObject('mock://preview')

    registerAmisRuntimeAdapter({
      getI18n: () => ({}) as never,
      getLocale: () => 'en-US',
      getCurrentUser: () => null,
      getAuthToken: () => undefined,
      setAuthToken: () => undefined,
      hasRole: () => false,
      getThemeConfig: () => ({ themeId: 'classic', displayMode: 'light' }),
      navigate: () => undefined,
      isCurrentUrl: () => false,
      notify: () => undefined,
      alert: async () => undefined,
      confirm: async () => true,
      logout: () => undefined,
      pageProvider: { getPage: async () => ({}) },
      dictProvider: { getDict: async () => ({ status: 200, data: { status: 0, msg: '', data: [] } }) },
      compileFunction: (code, currentPage) => new Function('page', `return (${code})`)(currentPage) as Function
    })

    const bound = (await bindActions({ onClick: '@fn:(page) => page.id' }, page)) as { onClick: Function }

    expect(bound.onClick(page)).toBe(page.id)
  })

  it('lazily resolves actions referenced inside compiled functions', async () => {
    const page = createAmisPageObject('mock://preview')

    registerAmisRuntimeAdapter({
      getI18n: () => ({}) as never,
      getLocale: () => 'en-US',
      getCurrentUser: () => null,
      getAuthToken: () => undefined,
      setAuthToken: () => undefined,
      hasRole: () => false,
      getThemeConfig: () => ({ themeId: 'classic', displayMode: 'light' }),
      navigate: () => undefined,
      isCurrentUrl: () => false,
      notify: () => undefined,
      alert: async () => undefined,
      confirm: async () => true,
      logout: () => undefined,
      pageProvider: { getPage: async () => ({}) },
      dictProvider: { getDict: async () => ({ status: 200, data: { status: 0, msg: '', data: [] } }) },
      resolveAction: (name: string) => (name === 'preview.notify' ? () => 'resolved lazily' : undefined),
      compileFunction: (code, currentPage) => new Function('page', `return (${code})`)(currentPage) as Function
    })

    const bound = (await bindActions({ onClick: '@fn:() => page.getAction("preview.notify")?.()' }, page)) as { onClick: Function }

    expect(bound.onClick()).toBe('resolved lazily')
    expect(page.getAction('preview.notify')).toBeTypeOf('function')
  })
})
