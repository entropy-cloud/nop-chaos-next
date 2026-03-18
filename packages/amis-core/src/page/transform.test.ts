import { describe, expect, it } from 'vitest'
import { registerAmisRuntimeAdapter } from '../adapter'
import type { AmisSchemaRecord } from '../types'
import { transformPageJson } from './transform'

function createMockAdapter() {
  return {
    getI18n: () => ({}) as never,
    getLocale: () => 'en-US',
    getCurrentUser: () => null,
    getAuthToken: () => undefined,
    setAuthToken: () => undefined,
    hasRole: (role: string) => role === 'admin',
    getThemeConfig: () => ({ themeId: 'classic', displayMode: 'light' as const }),
    navigate: () => undefined,
    isCurrentUrl: () => false,
    notify: () => undefined,
    alert: async () => undefined,
    confirm: async () => true,
    logout: () => undefined,
    pageProvider: { getPage: async () => ({}) },
    dictProvider: { getDict: async () => ({ status: 200, data: { status: 0, msg: '', data: [] } }) }
  }
}

describe('transformPageJson', () => {
  it('removes nodes blocked by xui:roles', async () => {
    registerAmisRuntimeAdapter(createMockAdapter())

    const transformed = await transformPageJson({
      type: 'page',
      body: [
        { type: 'tpl', tpl: 'always_visible' },
        { type: 'tpl', tpl: 'admin_only', 'xui:roles': 'admin' },
        { type: 'tpl', tpl: 'blocked', 'xui:roles': 'editor' }
      ]
    })

    expect(transformed).toMatchObject({
      body: [{ tpl: 'always_visible' }, { tpl: 'admin_only' }]
    })
  })

  it('adds nop-amis-page class to dialog bodyClassName', async () => {
    registerAmisRuntimeAdapter(createMockAdapter())

    const transformed = (await transformPageJson({
      type: 'button',
      onClick: {
        type: 'dialog',
        title: 'Test Dialog',
        body: 'dialog content'
      }
    })) as AmisSchemaRecord

    const dialog = transformed.onClick as AmisSchemaRecord
    expect(dialog.bodyClassName).toContain('nop-amis-page')
  })

  it('adds nop-amis-page class to drawer className', async () => {
    registerAmisRuntimeAdapter(createMockAdapter())

    const transformed = (await transformPageJson({
      type: 'button',
      onClick: {
        type: 'drawer',
        title: 'Test Drawer',
        body: 'drawer content'
      }
    })) as AmisSchemaRecord

    const drawer = transformed.onClick as AmisSchemaRecord
    expect(drawer.className).toContain('nop-amis-page')
  })

  it('preserves existing className when adding nop-amis-page', async () => {
    registerAmisRuntimeAdapter(createMockAdapter())

    const transformed = (await transformPageJson({
      type: 'drawer',
      className: 'existing-class',
      body: 'content'
    })) as AmisSchemaRecord

    expect(transformed.className).toContain('nop-amis-page')
    expect(transformed.className).toContain('existing-class')
  })
})
