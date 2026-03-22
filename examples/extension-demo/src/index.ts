import type { ShellExtension } from '@nop-chaos/shared'
import { ExtensionBuiltinPage } from './pages/ExtensionBuiltinPage'
import { ExtensionLoginPage } from './pages/ExtensionLoginPage'
import { ExtensionNotFoundPage } from './pages/ExtensionNotFoundPage'

const harborMarkHref = new URL('./harbor-mark.svg', import.meta.url).href
const harborThemeHref = new URL('./harbor.css', import.meta.url).href
const harborShellHref = new URL('./shell.css', import.meta.url).href
const harborPageHref = new URL('./component-page.css', import.meta.url).href

const extension: ShellExtension = {
  id: 'example-extension-demo',
  order: 50,
  app: {
    defaultLanguage: 'en-US'
  },
  branding: {
    name: 'Harbor Operations Suite',
    shortName: 'Harbor',
    logoUrl: harborMarkHref,
    markUrl: harborMarkHref,
    documentTitle: 'Harbor Operations Suite',
    faviconUrl: '/favicon.ico'
  },
  loginUi: {
    heroTitleKey: 'extensionDemo.login.heroTitle',
    heroDescriptionKey: 'extensionDemo.login.heroDescription',
    cardTitleKey: 'extensionDemo.login.cardTitle',
    cardDescriptionKey: 'extensionDemo.login.cardDescription',
    features: [
      {
        titleKey: 'extensionDemo.login.feature.coordination.title',
        descriptionKey: 'extensionDemo.login.feature.coordination.description'
      },
      {
        titleKey: 'extensionDemo.login.feature.themes.title',
        descriptionKey: 'extensionDemo.login.feature.themes.description'
      },
      {
        titleKey: 'extensionDemo.login.feature.bridge.title',
        descriptionKey: 'extensionDemo.login.feature.bridge.description'
      }
    ],
    showDemoHint: true
  },
  shell: {
    defaultHomePath: '/examples/extension-harbor'
  },
  systemPages: {
    login: 'extension-harbor-login',
    notFound: 'extension-harbor-not-found',
    dashboard: 'extension-harbor-page'
  },
  supportedLanguages: [
    { code: 'en-US', labelKey: 'settings.languageOptions.en' },
    { code: 'fr-FR', labelKey: 'settings.languageOptions.frFR' }
  ],
  themes: [
    {
      id: 'harbor',
      labelKey: 'settings.themeOptions.harbor.label',
      descriptionKey: 'settings.themeOptions.harbor.description',
      cssHref: harborThemeHref
    }
  ],
  styles: [
    {
      id: 'example-extension-demo-shell',
      href: harborShellHref,
      scope: 'shell'
    },
    {
      id: 'example-extension-demo-component-page',
      href: harborPageHref,
      scope: 'shell'
    }
  ],
  builtinPages: [
    {
      componentId: 'extension-harbor-page',
      component: ExtensionBuiltinPage
    },
    {
      componentId: 'extension-harbor-login',
      component: ExtensionLoginPage
    },
    {
      componentId: 'extension-harbor-not-found',
      component: ExtensionNotFoundPage
    }
  ],
  menus: [
    {
      id: 'extension-demo-harbor',
      title: 'Extension Harbor Page',
      path: '/examples/extension-harbor',
      icon: 'palette',
      pageType: 'builtin',
      componentId: 'extension-harbor-page',
      sort: 980
    }
  ],
  i18nResources: [
    {
      lng: 'en-US',
      resource: {
        extensionDemo: {
          login: {
            cardTitle: 'Enter Harbor',
            heroTitle: 'Bring shell branding, themes, and extension points together for each business application.',
            heroDescription: 'This demo extension shows how a reused host shell can present a different product identity without replacing the entire framework.',
            cardDescription: 'Use the default account to enter the Harbor workspace.',
            feature: {
              coordination: {
                title: 'Shell coordination',
                description: 'Branding, menus, and default routes stay aligned through one extension.'
              },
              themes: {
                title: 'App-tailored themes',
                description: 'Each application can publish its own visual language on top of the same host shell.'
              },
              bridge: {
                title: 'Shared runtime bridge',
                description: 'Built-in pages and plugins still reuse the same host runtime modules.'
              }
            }
          }
        },
        settings: {
          languageOptions: {
            en: 'English',
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
        extensionDemo: {
          login: {
            cardTitle: 'Entrer dans Harbor',
            heroTitle: "Unifier branding, themes et points d'extension du shell pour chaque application metier.",
            heroDescription: 'Cette extension de demonstration montre comment reutiliser le meme host shell avec une identite produit differente.',
            cardDescription: "Utilisez le compte par defaut pour entrer dans l'espace Harbor.",
            feature: {
              coordination: {
                title: 'Coordination du shell',
                description: 'Branding, menus et route par defaut restent alignes via une seule extension.'
              },
              themes: {
                title: 'Themes adaptes',
                description: 'Chaque application peut publier son propre style visuel au-dessus du meme shell hote.'
              },
              bridge: {
                title: 'Pont runtime partage',
                description: 'Les pages internes et plugins continuent de reutiliser les modules du host runtime.'
              }
            }
          }
        },
        settings: {
          languageOptions: {
            en: 'Anglais',
            frFR: 'Francais'
          },
          themeOptions: {
            harbor: {
              label: 'Harbor',
              description: "Couleurs cotieres pour tableaux de bord et ecrans d'operations."
            }
          }
        }
      }
    }
  ]
}

export default extension
