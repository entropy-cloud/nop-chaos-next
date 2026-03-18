import type { ContributionSource } from '@nop-chaos/shared'

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_MOCK?: string
  readonly VITE_ENABLE_DEMO_CONTRIBUTION?: string
  readonly VITE_DEMO_CONTRIBUTION_ASSET_ORIGIN?: string
  readonly VITE_DEMO_CONTRIBUTION_ENTRY?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_API_PROXY?: string
  readonly VITE_SIDEBAR_WIDTH?: string
  readonly VITE_SIDEBAR_COLLAPSED_WIDTH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  __NOP_CONTRIBUTIONS__?: ContributionSource[]
  __NOP_HOST_ORIGIN__?: string
}

declare var __NOP_SHARED__: Record<string, unknown> | undefined
