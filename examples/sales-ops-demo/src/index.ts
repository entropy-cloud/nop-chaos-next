import type { ShellContribution } from '@nop-chaos/shared'
import { SalesOpsDemoPage } from './pages/SalesOpsDemoPage'

function getHostOrigin() {
  if (typeof window === 'undefined') {
    return undefined
  }

  return (window as typeof window & { __NOP_HOST_ORIGIN__?: string }).__NOP_HOST_ORIGIN__ ?? window.location.origin
}

function toHostAssetUrl(path: string) {
  const hostOrigin = getHostOrigin()

  if (!hostOrigin) {
    return new URL(path, import.meta.url).href
  }

  return new URL(path, hostOrigin).href
}

const contribution: ShellContribution = {
  id: 'example-sales-ops-demo',
  order: 50,
  app: {
    defaultLanguage: 'en-US'
  },
  languages: [
    {
      code: 'fr-FR',
      labelKey: 'settings.languageOptions.frFR'
    }
  ],
  themes: [
    {
      id: 'sales-ops-demo',
      labelKey: 'settings.themeOptions.sales-ops-demo.label',
      descriptionKey: 'settings.themeOptions.sales-ops-demo.description',
      cssHref: toHostAssetUrl('/src/theme.css')
    }
  ],
  styles: [
    {
      id: 'sales-ops-demo-contribution-shell',
      href: toHostAssetUrl('/src/shell.css'),
      scope: 'shell'
    },
    {
      id: 'sales-ops-demo-contribution-page',
      href: toHostAssetUrl('/src/component-page.css'),
      scope: 'shell'
    }
  ],
  builtinPages: [
    {
      componentId: 'sales-ops-demo-page',
      component: SalesOpsDemoPage
    }
  ],
  menus: [
    {
      id: 'sales-ops-demo-menu',
      title: 'Sales Ops Demo Page',
      path: '/examples/sales-ops-demo',
      icon: 'palette',
      pageType: 'builtin',
      componentId: 'sales-ops-demo-page',
      sort: 980
    }
  ],
  i18nResources: [
    {
      lng: 'zh-CN',
      resource: {
        settings: {
          languageOptions: {
            frFR: 'French'
          },
          themeOptions: {
            'sales-ops-demo': {
              label: 'Sales Ops Demo',
              description: 'Sales Ops Demo theme delivered by the contribution package.'
            }
          }
        }
      }
    },
    {
      lng: 'en-US',
      resource: {
        settings: {
          languageOptions: {
            frFR: 'French'
          },
          themeOptions: {
            'sales-ops-demo': {
              label: 'Sales Ops Demo',
              description: 'Sales Ops Demo theme delivered by the contribution package.'
            }
          }
        }
      }
    },
    {
      lng: 'fr-FR',
      resource: {
        settings: {
          languageOptions: {
            frFR: 'Francais'
          },
          themeOptions: {
            'sales-ops-demo': {
              label: 'Sales Ops Demo',
              description: 'Sales Ops Demo theme delivered by the contribution package.'
            }
          }
        }
      }
    }
  ]
}

export default contribution
