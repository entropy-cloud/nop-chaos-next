import { describe, expect, it } from 'vitest'
import { registerAmisRuntimeAdapter } from '../adapter'
import { transformPageJson } from './transform'

describe('transformPageJson', () => {
  it('removes nodes blocked by xui:roles', async () => {
    registerAmisRuntimeAdapter({
      getI18n: () => ({}) as never,
      getLocale: () => 'en-US',
      getCurrentUser: () => null,
      getAuthToken: () => undefined,
      setAuthToken: () => undefined,
      hasRole: (role) => role === 'admin',
      getThemeConfig: () => ({ themeId: 'classic', displayMode: 'light' }),
      navigate: () => undefined,
      isCurrentUrl: () => false,
      notify: () => undefined,
      alert: async () => undefined,
      confirm: async () => true,
      logout: () => undefined,
      pageProvider: { getPage: async () => ({}) },
      dictProvider: { getDict: async () => ({ status: 200, data: { status: 0, msg: '', data: [] } }) }
    })

    const transformed = await transformPageJson({
      type: 'page',
      body: [
        { type: 'tpl', tpl: 'always-visible' },
        { type: 'tpl', tpl: 'admin-only', 'xui:roles': 'admin' },
        { type: 'tpl', tpl: 'blocked', 'xui:roles': 'editor' }
      ]
    })

    expect(transformed).toMatchObject({
      body: [{ tpl: 'always-visible' }, { tpl: 'admin-only' }]
    })
  })
})
