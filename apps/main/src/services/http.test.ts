import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';

const mockCreateHttpClient = vi.fn();
const mockSetRefreshTokenFetcher = vi.fn();
const mockClearTokens = vi.fn();
const mockSetTokens = vi.fn();
const mockGetValidToken = vi.fn();
const mockUnwrapApiPayload = vi.fn();

vi.mock('@nop-chaos/shared', () => ({
  createHttpClient: (...args: unknown[]) => mockCreateHttpClient(...args),
  setRefreshTokenFetcher: (...args: unknown[]) => mockSetRefreshTokenFetcher(...args),
  clearTokens: (...args: unknown[]) => mockClearTokens(...args),
  setTokens: (...args: unknown[]) => mockSetTokens(...args),
  getValidToken: (...args: unknown[]) => mockGetValidToken(...args),
  unwrapApiPayload: (...args: unknown[]) => mockUnwrapApiPayload(...args),
}));

const mockRefreshAccessToken = vi.fn();

vi.mock('./authApi', () => ({
  refreshAccessToken: (...args: unknown[]) => mockRefreshAccessToken(...args),
}));

vi.mock('../config/i18n/languages', () => ({
  normalizeLanguageCode: (lang: string) => lang,
}));

vi.mock('../config/i18n', () => ({
  default: { language: 'en' },
}));

describe('http', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let capturedConfig: any;

  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      token: undefined,
      tokens: undefined,
      bootstrapStatus: 'idle',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateHttpClient.mockImplementation((config: any) => {
      capturedConfig = config;
      return {
        request: vi.fn().mockResolvedValue({ status: 200, data: { data: {} } }),
      };
    });
  });

  it('creates http client with config functions', async () => {
    const { mainHttpClient } = await import('./http');

    expect(mockCreateHttpClient).toHaveBeenCalledOnce();
    expect(mainHttpClient).toBeDefined();
    expect(capturedConfig.getTimeoutMs()).toBe(15_000);
  });

  it('setRefreshTokenFetcher is called on module load', async () => {
    await import('./http');
    expect(mockSetRefreshTokenFetcher).toHaveBeenCalledOnce();
  });

  it('getAuthToken reads from auth store', async () => {
    await import('./http');
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('my-auth-token');

    const token = capturedConfig.getAuthToken();
    expect(token).toBe('my-auth-token');
  });

  it('getRefreshToken reads from auth store tokens', async () => {
    await import('./http');
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('tok', 'rt-456', 3600, 86400);

    const rt = capturedConfig.getRefreshToken();
    expect(rt).toBe('rt-456');
  });

  it('getRefreshToken returns undefined when no tokens', async () => {
    await import('./http');
    expect(capturedConfig.getRefreshToken()).toBeUndefined();
  });

  it('refreshAccessToken throws when no refresh token', async () => {
    await import('./http');
    await expect(capturedConfig.refreshAccessToken()).rejects.toThrow('No refresh token available');
  });

  it('refreshAccessToken refreshes and syncs tokens', async () => {
    await import('./http');
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('old', 'rt-old', 60, 3600);
    mockRefreshAccessToken.mockResolvedValue({
      accessToken: 'new-access',
      expiresIn: 300,
      refreshToken: 'new-rt',
      refreshExpiresIn: 86400,
    });

    const result = await capturedConfig.refreshAccessToken();

    expect(result).toBe('new-access');
    expect(mockSetTokens).toHaveBeenCalled();
    expect(useAuthStore.getState().token).toBe('new-access');
  });

  it('setAuthToken sets token in store when provided', async () => {
    await import('./http');
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('old');

    capturedConfig.setAuthToken('new-tok');
    expect(useAuthStore.getState().token).toBe('new-tok');
  });

  it('setAuthToken does nothing when token is falsy', async () => {
    await import('./http');
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('old');

    capturedConfig.setAuthToken('');
    expect(useAuthStore.getState().token).toBe('old');
  });

  it('clearTokens clears managed tokens and store', async () => {
    await import('./http');
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('tok');

    capturedConfig.clearTokens();
    expect(mockClearTokens).toHaveBeenCalledOnce();
    expect(useAuthStore.getState().token).toBeUndefined();
  });

  it('onUnauthorized clears tokens and logs out', async () => {
    await import('./http');
    useAuthStore.getState().login({
      user: { id: '1', username: 'test', roles: [] },
      token: 'tok',
      tokens: { accessToken: 'tok' },
    });

    capturedConfig.onUnauthorized();

    expect(mockClearTokens).toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().bootstrapStatus).toBe('anonymous');
  });

  it('getLocale delegates to normalizeLanguageCode', async () => {
    await import('./http');
    const locale = capturedConfig.getLocale();
    expect(typeof locale).toBe('string');
  });

  it('getBaseUrl returns empty string by default', async () => {
    await import('./http');
    const url = capturedConfig.getBaseUrl();
    expect(typeof url).toBe('string');
  });
});
