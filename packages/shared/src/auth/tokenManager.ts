import type { AuthTokens } from '../types/user';
import { getAuthConfig } from './config';

export interface TokenStorage {
  getTokens(): AuthTokens | null;
  setTokens(tokens: AuthTokens): void;
  clearTokens(): void;
}

function createMemoryStorage(): TokenStorage {
  let tokens: AuthTokens | null = null;
  return {
    getTokens: () => tokens,
    setTokens: (newTokens) => {
      tokens = newTokens;
    },
    clearTokens: () => {
      tokens = null;
    },
  };
}

function createWebStorage(storage: Storage): TokenStorage {
  const STORAGE_KEY = 'auth:tokens:v1';
  return {
    getTokens: () => {
      try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as AuthTokens;
      } catch {
        return null;
      }
    },
    setTokens: (tokens) => {
      const config = getAuthConfig();
      const toStore: AuthTokens = {
        accessToken: tokens.accessToken,
        expiresAt: tokens.expiresAt,
      };
      if (config.persistRefreshToken) {
        toStore.refreshToken = tokens.refreshToken;
        toStore.refreshExpiresAt = tokens.refreshExpiresAt;
      }
      storage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    },
    clearTokens: () => {
      storage.removeItem(STORAGE_KEY);
    },
  };
}

function createNoneStorage(): TokenStorage {
  return {
    getTokens: () => null,
    setTokens: () => {},
    clearTokens: () => {},
  };
}

export function createTokenStorage(): TokenStorage {
  const config = getAuthConfig();
  switch (config.tokenStorage) {
    case 'sessionStorage':
      return createWebStorage(sessionStorage);
    case 'localStorage':
      return createWebStorage(localStorage);
    case 'memory':
      return createMemoryStorage();
    case 'none':
      return createNoneStorage();
    default:
      return createWebStorage(sessionStorage);
  }
}

let tokenStorage: TokenStorage | null = null;
let refreshPromise: Promise<string> | null = null;

export function getTokenStorage(): TokenStorage {
  if (!tokenStorage) {
    tokenStorage = createTokenStorage();
  }
  return tokenStorage;
}

export function resetTokenStorage(): void {
  tokenStorage = null;
}

export function getRefreshPromise(): Promise<string> | null {
  return refreshPromise;
}

export function setRefreshPromise(promise: Promise<string> | null): void {
  refreshPromise = promise;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  refreshExpiresIn?: number;
}

export type RefreshTokenFetcher = (refreshToken: string) => Promise<RefreshTokenResponse>;

let refreshTokenFetcher: RefreshTokenFetcher | null = null;

export function setRefreshTokenFetcher(fetcher: RefreshTokenFetcher): void {
  refreshTokenFetcher = fetcher;
}

export function getAccessToken(): string | undefined {
  const tokens = getTokenStorage().getTokens();
  return tokens?.accessToken;
}

export function getRefreshToken(): string | undefined {
  const tokens = getTokenStorage().getTokens();
  return tokens?.refreshToken;
}

export function setTokens(
  accessToken: string,
  refreshToken?: string,
  expiresIn?: number,
  refreshExpiresIn?: number,
): void {
  const now = Date.now();
  const tokens: AuthTokens = {
    accessToken,
    expiresAt: expiresIn ? now + expiresIn * 1000 : undefined,
    refreshToken,
    refreshExpiresAt: refreshExpiresIn ? now + refreshExpiresIn * 1000 : undefined,
  };
  getTokenStorage().setTokens(tokens);
}

export function clearTokens(): void {
  getTokenStorage().clearTokens();
}

export function isTokenExpiringSoon(): boolean {
  const tokens = getTokenStorage().getTokens();
  if (!tokens?.expiresAt) return false;

  const config = getAuthConfig();
  const bufferMs = config.tokenRefreshBeforeExpiry * 1000;
  return Date.now() > tokens.expiresAt - bufferMs;
}

export function isTokenExpired(): boolean {
  const tokens = getTokenStorage().getTokens();
  if (!tokens?.expiresAt) return true;
  return Date.now() >= tokens.expiresAt;
}

export async function refreshAccessToken(): Promise<string> {
  const tokens = getTokenStorage().getTokens();
  if (!tokens?.refreshToken) {
    throw new Error('No refresh token available');
  }

  if (!refreshTokenFetcher) {
    throw new Error('Refresh token fetcher not configured');
  }

  const response = await refreshTokenFetcher(tokens.refreshToken);

  setTokens(
    response.accessToken,
    response.refreshToken ?? tokens.refreshToken,
    response.expiresIn,
    response.refreshExpiresIn,
  );

  return response.accessToken;
}

export async function getValidToken(): Promise<string | undefined> {
  const config = getAuthConfig();

  if (!config.enableAutoRefresh) {
    return getAccessToken();
  }

  if (isTokenExpiringSoon() && getRefreshToken()) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    try {
      return await refreshPromise;
    } catch {
      return getAccessToken();
    }
  }

  return getAccessToken();
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getTokenExpiry(token: string): number | null {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  return payload.exp * 1000;
}
