import type { TokenStorageType } from '../types/extension'

export interface AuthRuntimeConfig {
  tokenStorage: TokenStorageType
  persistRefreshToken: boolean
  tokenRefreshBeforeExpiry: number
  enableAutoRefresh: boolean
  refreshTokenEndpoint: string
}

const defaultConfig: AuthRuntimeConfig = {
  tokenStorage: 'sessionStorage',
  persistRefreshToken: false,
  tokenRefreshBeforeExpiry: 60,
  enableAutoRefresh: true,
  refreshTokenEndpoint: '/r/LoginApi__refreshToken'
}

let runtimeConfig: AuthRuntimeConfig = { ...defaultConfig }

export function getAuthConfig(): AuthRuntimeConfig {
  return runtimeConfig
}

export function setAuthConfig(config: Partial<AuthRuntimeConfig>): void {
  runtimeConfig = { ...runtimeConfig, ...config }
}

export function resetAuthConfig(): void {
  runtimeConfig = { ...defaultConfig }
}
