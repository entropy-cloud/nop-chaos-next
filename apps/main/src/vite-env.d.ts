import type { ExtensionSource } from '@nop-chaos/shared'

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_MOCK?: string
  readonly VITE_ENABLE_DEMO_EXTENSION?: string
  readonly VITE_DEMO_EXTENSION_ENTRY?: string
  readonly VITE_DEMO_EXTENSION_ALIAS_PATH?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_USE_API_PROXY?: string
  readonly VITE_SIDEBAR_WIDTH?: string
  readonly VITE_SIDEBAR_COLLAPSED_WIDTH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  __NOP_EXTENSIONS__?: ExtensionSource[]
}

declare const __NOP_SHARED__: Record<string, unknown> | undefined
