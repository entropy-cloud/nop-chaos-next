import type { ContributionLogger, LoadedContribution } from '@nop-chaos/shared'
import i18n, { initializeI18n } from '../config/i18n'
import { registerLanguages, setDefaultLanguage } from '../config/i18n/languages'
import { registerThemes } from '../config/themeRegistry'
import { registerBuiltinPages } from '../router/pageRegistry'
import { getContributionSources } from './config'
import { loadContributions } from './loadContributions'
import { setLoadedContributions } from './runtime'

const logger: ContributionLogger = {
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message)
}

function ensureStylesheet(id: string, href: string) {
  const selector = `link[data-contribution-style='${id}']`

  if (document.querySelector(selector)) {
    return
  }

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.contributionStyle = id
  document.head.append(link)
}

function applyContributionDefinitions(loaded: LoadedContribution[]) {
  for (const { contribution } of loaded) {
    if (contribution.app?.defaultLanguage) {
      setDefaultLanguage(contribution.app.defaultLanguage)
    }

    if (contribution.languages) {
      registerLanguages(contribution.languages)
    }

    if (contribution.themes) {
      registerThemes(
        contribution.themes.map((theme) => ({
          id: theme.id,
          labelKey: theme.labelKey,
          descriptionKey: theme.descriptionKey
        }))
      )

      for (const theme of contribution.themes) {
        if (theme.cssHref) {
          ensureStylesheet(`theme:${theme.id}`, theme.cssHref)
        }
      }
    }

    for (const style of contribution.styles ?? []) {
      ensureStylesheet(`style:${style.id}`, style.href)
    }

    if (contribution.builtinPages) {
      registerBuiltinPages(contribution.builtinPages)
    }
  }
}

function applyContributionI18nResources(loaded: LoadedContribution[]) {
  for (const { contribution } of loaded) {
    for (const resource of contribution.i18nResources ?? []) {
      i18n.addResourceBundle(resource.lng, resource.ns ?? 'translation', resource.resource, true, true)
    }
  }
}

export async function bootstrapContributions(): Promise<LoadedContribution[]> {
  const sources = getContributionSources()

  if (sources.length === 0) {
    setLoadedContributions([])
    await initializeI18n()
    return []
  }

  const loaded = await loadContributions({
    sources,
    context: {
      logger
    }
  })

  applyContributionDefinitions(loaded)
  setLoadedContributions(loaded)
  await initializeI18n()
  applyContributionI18nResources(loaded)

  return loaded
}
