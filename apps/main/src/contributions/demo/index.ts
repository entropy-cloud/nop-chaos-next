import type { ShellContribution } from '@nop-chaos/shared'

const sunriseThemeHref = new URL('./sunrise.css', import.meta.url).href

const demoContribution: ShellContribution = {
  id: 'demo-shell-contribution',
  order: 100,
  languages: [
    {
      code: 'ja-JP',
      labelKey: 'settings.languageOptions.jaJP'
    }
  ],
  themes: [
    {
      id: 'sunrise',
      labelKey: 'settings.themeOptions.sunrise.label',
      descriptionKey: 'settings.themeOptions.sunrise.description',
      cssHref: sunriseThemeHref
    }
  ],
  i18nResources: [
    {
      lng: 'zh-CN',
      resource: {
        settings: {
          languageOptions: {
            jaJP: 'Japanese'
          },
          themeOptions: {
            sunrise: {
              label: 'Sunrise',
              description: 'Warm amber surfaces with a brighter accent palette for business dashboards.'
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
            jaJP: 'Japanese'
          },
          themeOptions: {
            sunrise: {
              label: 'Sunrise',
              description: 'Warm amber surfaces with a brighter accent palette for business dashboards.'
            }
          }
        }
      }
    },
    {
      lng: 'ja-JP',
      resource: {
        settings: {
          languageOptions: {
            jaJP: 'Japanese'
          },
          themeOptions: {
            sunrise: {
              label: 'Sunrise',
              description: 'Warm amber surfaces with a brighter accent palette for business dashboards.'
            }
          }
        }
      }
    }
  ]
}

export default demoContribution
