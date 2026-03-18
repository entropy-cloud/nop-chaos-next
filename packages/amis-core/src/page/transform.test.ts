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

  it('adds amis class to dialog className and bodyClassName', async () => {
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
    expect(dialog.className).toContain('amis')
    expect(dialog.bodyClassName).toContain('amis')
  })

  it('preserves existing dialog className and bodyClassName when adding amis', async () => {
    registerAmisRuntimeAdapter(createMockAdapter())

    const transformed = (await transformPageJson({
      type: 'dialog',
      className: 'dialog-shell',
      bodyClassName: 'dialog-body',
      body: 'content'
    })) as AmisSchemaRecord

    expect(transformed.className).toContain('amis')
    expect(transformed.className).toContain('dialog-shell')
    expect(transformed.bodyClassName).toContain('amis')
    expect(transformed.bodyClassName).toContain('dialog-body')
  })

  it('adds amis class to drawer className', async () => {
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
    expect(drawer.className).toContain('amis')
  })

  it('preserves existing className when adding amis', async () => {
    registerAmisRuntimeAdapter(createMockAdapter())

    const transformed = (await transformPageJson({
      type: 'drawer',
      className: 'existing-class',
      body: 'content'
    })) as AmisSchemaRecord

    expect(transformed.className).toContain('amis')
    expect(transformed.className).toContain('existing-class')
  })

  it('adds amis class to modal className and bodyClassName', async () => {
    registerAmisRuntimeAdapter(createMockAdapter())

    const transformed = (await transformPageJson({
      type: 'modal',
      title: 'Test Modal',
      body: 'modal content'
    })) as AmisSchemaRecord

    expect(transformed.className).toContain('amis')
    expect(transformed.bodyClassName).toContain('amis')
  })
})
