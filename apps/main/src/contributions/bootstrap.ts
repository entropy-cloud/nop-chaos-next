import { resetTokenStorage, setAuthConfig } from '@nop-chaos/shared'
import type { ContributionLogger, LoadedContribution } from '@nop-chaos/shared'
import i18n, { initializeI18n } from '../config/i18n'
import { registerLanguages, setDefaultLanguage } from '../config/i18n/languages'
import { registerThemes } from '../config/themeRegistry'
import { registerHostSharedModules } from '../plugins/sharedModules'
import { registerBuiltinPages } from '../router/pageRegistry'
import { getContributionSources } from './config'
import { loadContributions } from './loadContributions'
import { resolveShellRuntimeConfig, setLoadedContributions, setShellRuntimeConfig } from './runtime'

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

function ensureLinkElement(rel: string) {
  const selector = `link[rel='${rel}']`
  const existing = document.querySelector(selector)

  if (existing && typeof existing === 'object' && 'href' in existing && 'rel' in existing) {
    return existing
  }

  const link = document.createElement('link')
  link.rel = rel
  document.head.append(link)
  return link
}

function applyDocumentBranding(loaded: LoadedContribution[]) {
  if (typeof document === 'undefined') {
    return
  }

  const runtimeConfig = resolveShellRuntimeConfig(loaded)
  setShellRuntimeConfig(runtimeConfig)
  document.title = runtimeConfig.branding.documentTitle

  if (runtimeConfig.branding.faviconUrl) {
    ensureLinkElement('icon').href = runtimeConfig.branding.faviconUrl
  }
}

function applyContributionDefinitions(loaded: LoadedContribution[]) {
  for (const { contribution } of loaded) {
    if (contribution.auth) {
      setAuthConfig(contribution.auth)
      resetTokenStorage()
    }

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
  registerHostSharedModules()

  const sources = getContributionSources()

  if (sources.length === 0) {
    setLoadedContributions([])
    applyDocumentBranding([])
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
  applyDocumentBranding(loaded)
  await initializeI18n()
  applyContributionI18nResources(loaded)

  return loaded
}
