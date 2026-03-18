import type { ShellContribution } from '@nop-chaos/shared'
import { ContributionBuiltinPage } from './pages/ContributionBuiltinPage'

const contribution: ShellContribution = {
  id: 'example-contribution-demo',
  order: 50,
  app: {
    defaultLanguage: 'en'
  },
  languages: [
    {
      code: 'fr-FR',
      labelKey: 'settings.languageOptions.frFR'
    }
  ],
  themes: [
    {
      id: 'harbor',
      labelKey: 'settings.themeOptions.harbor.label',
      descriptionKey: 'settings.themeOptions.harbor.description',
      cssHref: new URL('./harbor.css', import.meta.url).href
    }
  ],
  styles: [
    {
      id: 'example-contribution-demo-shell',
      href: new URL('./shell.css', import.meta.url).href,
      scope: 'shell'
    },
    {
      id: 'example-contribution-demo-component-page',
      href: new URL('./component-page.css', import.meta.url).href,
      scope: 'shell'
    }
  ],
  builtinPages: [
    {
      componentId: 'contribution-harbor-page',
      component: ContributionBuiltinPage
    }
  ],
  menus: [
    {
      id: 'contribution-demo-harbor',
      title: 'Contribution Harbor Page',
      path: '/examples/contribution-harbor',
      icon: 'palette',
      pageType: 'builtin',
      componentId: 'contribution-harbor-page',
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
            harbor: {
              label: 'Harbor',
              description: 'Cool coastal colors for shared dashboards and operations screens.'
            }
          }
        }
      }
    },
    {
      lng: 'en',
      resource: {
        settings: {
          languageOptions: {
            frFR: 'French'
          },
          themeOptions: {
            harbor: {
              label: 'Harbor',
              description: 'Cool coastal colors for shared dashboards and operations screens.'
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
            harbor: {
              label: 'Harbor',
              description: 'Cool coastal colors for shared dashboards and operations screens.'
            }
          }
        }
      }
    }
  ]
}

export default contribution
