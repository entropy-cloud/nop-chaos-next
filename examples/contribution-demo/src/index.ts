import type { ShellContribution } from '@nop-chaos/shared'
import { ContributionBuiltinPage } from './pages/ContributionBuiltinPage'
import { ContributionLoginPage } from './pages/ContributionLoginPage'
import { ContributionNotFoundPage } from './pages/ContributionNotFoundPage'

const harborMarkHref = new URL('./harbor-mark.svg', import.meta.url).href

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
  id: 'example-contribution-demo',
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
    faviconUrl: toHostAssetUrl('/favicon.ico')
  },
  loginUi: {
    heroTitleKey: 'contributionDemo.login.heroTitle',
    heroDescriptionKey: 'contributionDemo.login.heroDescription',
    cardTitleKey: 'contributionDemo.login.cardTitle',
    cardDescriptionKey: 'contributionDemo.login.cardDescription',
    features: [
      {
        titleKey: 'contributionDemo.login.feature.coordination.title',
        descriptionKey: 'contributionDemo.login.feature.coordination.description'
      },
      {
        titleKey: 'contributionDemo.login.feature.themes.title',
        descriptionKey: 'contributionDemo.login.feature.themes.description'
      },
      {
        titleKey: 'contributionDemo.login.feature.bridge.title',
        descriptionKey: 'contributionDemo.login.feature.bridge.description'
      }
    ],
    showDemoHint: true
  },
  shell: {
    defaultHomePath: '/examples/contribution-harbor'
  },
  systemPages: {
    login: 'contribution-harbor-login',
    notFound: 'contribution-harbor-not-found',
    dashboard: 'contribution-harbor-page'
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
      cssHref: toHostAssetUrl('/src/harbor.css')
    }
  ],
  styles: [
    {
      id: 'example-contribution-demo-shell',
      href: toHostAssetUrl('/src/shell.css'),
      scope: 'shell'
    },
    {
      id: 'example-contribution-demo-component-page',
      href: toHostAssetUrl('/src/component-page.css'),
      scope: 'shell'
    }
  ],
  builtinPages: [
    {
      componentId: 'contribution-harbor-page',
      component: ContributionBuiltinPage
    },
    {
      componentId: 'contribution-harbor-login',
      component: ContributionLoginPage
    },
    {
      componentId: 'contribution-harbor-not-found',
      component: ContributionNotFoundPage
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
        contributionDemo: {
          login: {
            cardTitle: 'Enter Harbor',
            heroTitle: 'Bring shell branding, themes, and extension points together for each business application.',
            heroDescription: 'This demo contribution shows how a reused host shell can present a different product identity without replacing the entire framework.',
            cardDescription: 'Use the default account to enter the Harbor workspace.',
            feature: {
              coordination: {
                title: 'Shell coordination',
                description: 'Branding, menus, and default routes stay aligned through one contribution.'
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
      lng: 'en-US',
      resource: {
        contributionDemo: {
          login: {
            cardTitle: 'Enter Harbor',
            heroTitle: 'Bring shell branding, themes, and extension points together for each business application.',
            heroDescription: 'This demo contribution shows how a reused host shell can present a different product identity without replacing the entire framework.',
            cardDescription: 'Use the default account to enter the Harbor workspace.',
            feature: {
              coordination: {
                title: 'Shell coordination',
                description: 'Branding, menus, and default routes stay aligned through one contribution.'
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
        contributionDemo: {
          login: {
            cardTitle: 'Entrer dans Harbor',
            heroTitle: 'Unifier branding, themes et points d extension du shell pour chaque application metier.',
            heroDescription: 'Cette contribution de demonstration montre comment reutiliser le meme host shell avec une identite produit differente.',
            cardDescription: 'Utilisez le compte par defaut pour entrer dans l espace Harbor.',
            feature: {
              coordination: {
                title: 'Coordination du shell',
                description: 'Branding, menus et route par defaut restent alignes via une seule contribution.'
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
