import type { ShellExtension } from '@nop-chaos/shared'

const sunriseThemeHref = new URL('./sunrise.css', import.meta.url).href

const demoExtension: ShellExtension = {
  id: 'demo-shell-extension',
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
      lng: 'en-US',
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

export default demoExtension
