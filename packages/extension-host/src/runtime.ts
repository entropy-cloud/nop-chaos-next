import type {
  ExtensionLoginUiFeature,
  ExtensionSystemPagesConfig,
  LoadedExtension,
  MenuResponse
} from '@nop-chaos/shared'
import { validateMenuResponse } from '@nop-chaos/shared'

let loadedExtensions: LoadedExtension[] = []

export interface ShellBrandingRuntimeConfig {
  name: string
  shortName: string
  logoUrl?: string
  markUrl?: string
  documentTitle: string
  faviconUrl?: string
}

export interface ShellLoginUiRuntimeConfig {
  heroTitleKey?: string
  heroDescriptionKey?: string
  cardTitleKey?: string
  cardDescriptionKey?: string
  features: ExtensionLoginUiFeature[]
  showDemoHint?: boolean
}

/**
 * ShellRuntimeConfig — the resolved runtime configuration for the host shell.
 *
 * This interface is intentionally defined here (rather than in @nop-chaos/shared)
 * because it represents a **runtime-merged** shape assembled from multiple extension
 * contributions. It combines branding, login UI, shell settings, and system pages into
 * a single resolved object via `resolveShellConfig()`.
 *
 * Related types in @nop-chaos/shared:
 * - `ExtensionBranding` — per-extension branding fields (subset of ShellBrandingRuntimeConfig)
 * - `ExtensionLoginUiFeature` — feature descriptor used in loginUi.features
 * - `ExtensionSystemPagesConfig` — system page component ID registry
 * - `LoadedExtension` — the full extension envelope processed at load time
 *
 * The separation is deliberate: shared types describe the **input** contract that
 * extensions must satisfy, while ShellRuntimeConfig describes the **output** shape
 * the host shell consumes after merging all extensions.
 */
export interface ShellRuntimeConfig {
  branding: ShellBrandingRuntimeConfig
  loginUi: ShellLoginUiRuntimeConfig
  shell: {
    defaultHomePath?: string
    helpUrl?: string
    aboutUrl?: string
    supportUrl?: string
  }
  systemPages: ExtensionSystemPagesConfig
}

const defaultLoginFeatures: ExtensionLoginUiFeature[] = [
  {
    titleKey: 'login.feature.layout.title',
    descriptionKey: 'login.feature.layout.description'
  },
  {
    titleKey: 'login.feature.routing.title',
    descriptionKey: 'login.feature.routing.description'
  },
  {
    titleKey: 'login.feature.themes.title',
    descriptionKey: 'login.feature.themes.description'
  }
]

const defaultShellRuntimeConfig: ShellRuntimeConfig = {
  branding: {
    name: 'NOP Chaos Console',
    shortName: 'Nop Chaos',
    documentTitle: 'NOP Chaos Console'
  },
  loginUi: {
    heroTitleKey: 'login.heroTitle',
    heroDescriptionKey: 'login.heroDescription',
    cardTitleKey: 'auth.login',
    cardDescriptionKey: 'login.cardDescription',
    features: defaultLoginFeatures
  },
  shell: {},
  systemPages: {}
}

let shellRuntimeConfig: ShellRuntimeConfig = defaultShellRuntimeConfig
const shellRuntimeConfigListeners = new Set<() => void>()

function notifyShellRuntimeConfigListeners() {
  for (const listener of shellRuntimeConfigListeners) {
    listener()
  }
}

export function setLoadedExtensions(extensions: LoadedExtension[]) {
  loadedExtensions = extensions
}

export function getLoadedExtensions(): LoadedExtension[] {
  return [...loadedExtensions]
}

export function setShellRuntimeConfig(config: ShellRuntimeConfig) {
  shellRuntimeConfig = {
    branding: {
      ...config.branding
    },
    loginUi: {
      ...config.loginUi,
      features: [...config.loginUi.features]
    },
    shell: {
      ...config.shell
    },
    systemPages: {
      ...config.systemPages
    }
  }

  notifyShellRuntimeConfigListeners()
}

export function getShellRuntimeConfig(): ShellRuntimeConfig {
  return shellRuntimeConfig
}

export function subscribeShellRuntimeConfig(listener: () => void): () => void {
  shellRuntimeConfigListeners.add(listener)

  return () => {
    shellRuntimeConfigListeners.delete(listener)
  }
}

export function resolveShellRuntimeConfig(extensions: LoadedExtension[]): ShellRuntimeConfig {
  const sorted = [...extensions].sort((left, right) => (left.extension.order ?? 0) - (right.extension.order ?? 0))
  const resolved: ShellRuntimeConfig = {
    branding: {
      ...defaultShellRuntimeConfig.branding
    },
    loginUi: {
      ...defaultShellRuntimeConfig.loginUi,
      features: [...defaultShellRuntimeConfig.loginUi.features]
    },
    shell: {
      ...defaultShellRuntimeConfig.shell
    },
    systemPages: {
      ...defaultShellRuntimeConfig.systemPages
    }
  }

  for (const { extension } of sorted) {
    const branding = extension.branding ?? {}
    const legacyApp = extension.app ?? {}

    resolved.branding = {
      ...resolved.branding,
      name: branding.name ?? legacyApp.name ?? resolved.branding.name,
      shortName: branding.shortName ?? legacyApp.shortName ?? resolved.branding.shortName,
      logoUrl: branding.logoUrl ?? legacyApp.logoUrl ?? resolved.branding.logoUrl,
      markUrl: branding.markUrl ?? resolved.branding.markUrl,
      documentTitle: branding.documentTitle ?? branding.name ?? legacyApp.name ?? resolved.branding.documentTitle,
      faviconUrl: branding.faviconUrl ?? resolved.branding.faviconUrl
    }

    if (extension.loginUi) {
      resolved.loginUi = {
        ...resolved.loginUi,
        ...extension.loginUi,
        features: extension.loginUi.features ? [...extension.loginUi.features] : resolved.loginUi.features
      }
    }

    if (extension.shell || legacyApp.defaultHomePath) {
      resolved.shell = {
        ...resolved.shell,
        ...extension.shell,
        defaultHomePath: extension.shell?.defaultHomePath ?? legacyApp.defaultHomePath ?? resolved.shell.defaultHomePath
      }
    }

    if (extension.systemPages) {
      resolved.systemPages = {
        ...resolved.systemPages,
        ...extension.systemPages
      }
    }
  }

  return resolved
}

export function getExtensionDefaultHomePath(): string | undefined {
  return shellRuntimeConfig.shell.defaultHomePath
}

export function getSystemPageComponentId(page: keyof ExtensionSystemPagesConfig): string | undefined {
  return shellRuntimeConfig.systemPages[page]
}

export function mergeExtensionMenus(menuResponse: MenuResponse): MenuResponse {
  const sorted = [...loadedExtensions].sort((a, b) => (a.extension.order ?? 0) - (b.extension.order ?? 0))

  let items = [...menuResponse.items]
  let home = menuResponse.home

  for (const { extension } of sorted) {
    const extMenus = extension.menus ?? []

    if (extMenus.length === 0) {
      continue
    }

    if (extension.overrideMenus) {
      items = [...extMenus]
      home = extMenus[0]?.path ?? home
      continue
    }

    items = [...items, ...extMenus]
    home = home ?? extMenus[0]?.path ?? '/'
  }

  return validateMenuResponse({
    ...menuResponse,
    items,
    home
  })
}

export function hasMenuOverride(): boolean {
  return loadedExtensions.some((item) => item.extension.overrideMenus)
}
