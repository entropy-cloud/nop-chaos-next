import type {
  ContributionLoginUiFeature,
  ContributionSystemPagesConfig,
  LoadedContribution,
  MenuResponse
} from '@nop-chaos/shared'
import { validateMenuResponse } from '@nop-chaos/shared'

let loadedContributions: LoadedContribution[] = []

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
  features: ContributionLoginUiFeature[]
  showDemoHint?: boolean
}

export interface ShellRuntimeConfig {
  branding: ShellBrandingRuntimeConfig
  loginUi: ShellLoginUiRuntimeConfig
  shell: {
    defaultHomePath?: string
    helpUrl?: string
    aboutUrl?: string
    supportUrl?: string
  }
  systemPages: ContributionSystemPagesConfig
}

const defaultLoginFeatures: ContributionLoginUiFeature[] = [
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

export function setLoadedContributions(contributions: LoadedContribution[]) {
  loadedContributions = contributions
}

export function getLoadedContributions(): LoadedContribution[] {
  return [...loadedContributions]
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
}

export function getShellRuntimeConfig(): ShellRuntimeConfig {
  return {
    branding: {
      ...shellRuntimeConfig.branding
    },
    loginUi: {
      ...shellRuntimeConfig.loginUi,
      features: [...shellRuntimeConfig.loginUi.features]
    },
    shell: {
      ...shellRuntimeConfig.shell
    },
    systemPages: {
      ...shellRuntimeConfig.systemPages
    }
  }
}

export function resolveShellRuntimeConfig(contributions: LoadedContribution[]): ShellRuntimeConfig {
  const sorted = [...contributions].sort((left, right) => (left.contribution.order ?? 0) - (right.contribution.order ?? 0))
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

  for (const { contribution } of sorted) {
    const branding = contribution.branding ?? {}
    const legacyApp = contribution.app ?? {}

    resolved.branding = {
      ...resolved.branding,
      name: branding.name ?? legacyApp.name ?? resolved.branding.name,
      shortName: branding.shortName ?? legacyApp.shortName ?? resolved.branding.shortName,
      logoUrl: branding.logoUrl ?? legacyApp.logoUrl ?? resolved.branding.logoUrl,
      markUrl: branding.markUrl ?? resolved.branding.markUrl,
      documentTitle: branding.documentTitle ?? branding.name ?? legacyApp.name ?? resolved.branding.documentTitle,
      faviconUrl: branding.faviconUrl ?? resolved.branding.faviconUrl
    }

    if (contribution.loginUi) {
      resolved.loginUi = {
        ...resolved.loginUi,
        ...contribution.loginUi,
        features: contribution.loginUi.features ? [...contribution.loginUi.features] : resolved.loginUi.features
      }
    }

    if (contribution.shell || legacyApp.defaultHomePath) {
      resolved.shell = {
        ...resolved.shell,
        ...contribution.shell,
        defaultHomePath: contribution.shell?.defaultHomePath ?? legacyApp.defaultHomePath ?? resolved.shell.defaultHomePath
      }
    }

    if (contribution.systemPages) {
      resolved.systemPages = {
        ...resolved.systemPages,
        ...contribution.systemPages
      }
    }
  }

  return resolved
}

export function getContributionDefaultHomePath(): string | undefined {
  return shellRuntimeConfig.shell.defaultHomePath
}

export function getSystemPageComponentId(page: keyof ContributionSystemPagesConfig): string | undefined {
  return shellRuntimeConfig.systemPages[page]
}

export function mergeContributionMenus(menuResponse: MenuResponse): MenuResponse {
  const contributedMenus = loadedContributions.flatMap((item) => item.contribution.menus ?? [])

  if (contributedMenus.length === 0) {
    return menuResponse
  }

  return validateMenuResponse({
    ...menuResponse,
    items: [...menuResponse.items, ...contributedMenus],
    home: menuResponse.home ?? contributedMenus[0]?.path ?? '/'
  })
}
