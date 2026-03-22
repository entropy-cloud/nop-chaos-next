import { resetTokenStorage, setAuthConfig } from '@nop-chaos/shared'
import type { ExtensionLogger, LoadedExtension } from '@nop-chaos/shared'
import i18n, { initializeI18n } from '../config/i18n'
import { registerLanguages, replaceLanguages, setDefaultLanguage } from '../config/i18n/languages'
import { registerThemes } from '../config/themeRegistry'
import { registerHostSharedModules } from '../plugins/sharedModules'
import { registerBuiltinPages } from '../router/pageRegistry'
import { getExtensionSources } from './config'
import { loadExtensions } from './loadExtensions'
import { resolveShellRuntimeConfig, setLoadedExtensions, setShellRuntimeConfig } from './runtime'

const logger: ExtensionLogger = {
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message)
}

function ensureStylesheet(id: string, href: string) {
  const selector = `link[data-extension-style='${id}']`

  if (document.querySelector(selector)) {
    return
  }

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.extensionStyle = id
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

function applyDocumentBranding(loaded: LoadedExtension[]) {
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

function applyExtensionDefinitions(loaded: LoadedExtension[]) {
  for (const { extension } of loaded) {
    if (extension.auth) {
      setAuthConfig(extension.auth)
      resetTokenStorage()
    }

    if (extension.app?.defaultLanguage) {
      setDefaultLanguage(extension.app.defaultLanguage)
    }

    if (extension.supportedLanguages) {
      replaceLanguages(extension.supportedLanguages)
    } else if (extension.languages) {
      registerLanguages(extension.languages)
    }

    if (extension.themes) {
      registerThemes(
        extension.themes.map((theme) => ({
          id: theme.id,
          labelKey: theme.labelKey,
          descriptionKey: theme.descriptionKey
        }))
      )

      for (const theme of extension.themes) {
        if (theme.cssHref) {
          ensureStylesheet(`theme:${theme.id}`, theme.cssHref)
        }
      }
    }

    for (const style of extension.styles ?? []) {
      ensureStylesheet(`style:${style.id}`, style.href)
    }

    if (extension.builtinPages) {
      registerBuiltinPages(extension.builtinPages)
    }
  }
}

function applyExtensionI18nResources(loaded: LoadedExtension[]) {
  for (const { extension } of loaded) {
    for (const resource of extension.i18nResources ?? []) {
      i18n.addResourceBundle(resource.lng, resource.ns ?? 'translation', resource.resource, true, true)
    }
  }
}

export async function bootstrapExtensions(): Promise<LoadedExtension[]> {
  registerHostSharedModules()

  const sources = getExtensionSources()

  if (sources.length === 0) {
    setLoadedExtensions([])
    applyDocumentBranding([])
    await initializeI18n()
    return []
  }

  const loaded = await loadExtensions({
    sources,
    context: {
      logger
    }
  })

  applyExtensionDefinitions(loaded)
  setLoadedExtensions(loaded)
  applyDocumentBranding(loaded)
  await initializeI18n()
  applyExtensionI18nResources(loaded)

  return loaded
}
