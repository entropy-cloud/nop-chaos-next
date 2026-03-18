import { registerXuiComponent } from '@nop-chaos/amis-core'
import type { AmisSchemaRecord } from '@nop-chaos/amis-core'

function asArray(value: unknown) {
  if (Array.isArray(value)) {
    return value
  }

  if (value == null) {
    return []
  }

  return [value]
}

function registerPageSectionComponent() {
  registerXuiComponent('host.page-section', async (schema: AmisSchemaRecord) => {
    const title = typeof schema.title === 'string' ? schema.title : undefined
    const description = typeof schema.description === 'string' ? schema.description : undefined
    const body = asArray(schema.body)
    const nextBody = []

    if (title || description) {
      nextBody.push({
        type: 'container',
        className: 'mb-4 rounded-xl border border-[hsl(var(--border))] bg-[color-mix(in_hsl,hsl(var(--background))_72%,transparent)] px-5 py-4 shadow-sm',
        body: [
          title
            ? {
                type: 'tpl',
                tpl: title,
                className: 'text-lg font-semibold text-foreground'
              }
            : null,
          description
            ? {
                type: 'tpl',
                tpl: description,
                className: 'mt-1 text-sm text-[hsl(var(--muted-foreground))]'
              }
            : null
        ].filter(Boolean)
      })
    }

    nextBody.push(...body)

    return {
      type: 'container',
      className: 'nop-host-page-section',
      body: nextBody
    }
  })
}

export function registerMainXuiComponents() {
  registerPageSectionComponent()
}
