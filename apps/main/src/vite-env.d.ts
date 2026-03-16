/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_MOCK?: string
  readonly VITE_SIDEBAR_WIDTH?: string
  readonly VITE_SIDEBAR_COLLAPSED_WIDTH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
