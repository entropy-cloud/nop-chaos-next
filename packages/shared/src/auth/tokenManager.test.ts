import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const mockConfig = {
  tokenStorage: 'memory' as const,
  tokenRefreshBeforeExpiry: 60,
  enableAutoRefresh: true,
  persistRefreshToken: false,
};

vi.mock('./config', () => ({
  getAuthConfig: () => mockConfig,
}));

describe('tokenManager', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConfig.tokenStorage = 'memory';
    mockConfig.enableAutoRefresh = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getAccessToken returns undefined when no tokens stored', async () => {
    const { getAccessToken } = await import('./tokenManager');
    expect(getAccessToken()).toBeUndefined();
  });

  it('setTokens and getAccessToken round-trip', async () => {
    const { setTokens, getAccessToken } = await import('./tokenManager');
    setTokens('access-1', 'refresh-1', 3600, 86400);
    expect(getAccessToken()).toBe('access-1');
  });

  it('isTokenExpiringSoon returns false when no tokens', async () => {
    const { isTokenExpiringSoon } = await import('./tokenManager');
    expect(isTokenExpiringSoon()).toBe(false);
  });

  it('isTokenExpired returns true when no tokens', async () => {
    const { isTokenExpired } = await import('./tokenManager');
    expect(isTokenExpired()).toBe(true);
  });

  it('refreshAccessToken throws when no refresh token available', async () => {
    const { refreshAccessToken } = await import('./tokenManager');
    await expect(refreshAccessToken()).rejects.toThrow('No refresh token available');
  });

  it('refreshAccessToken throws when fetcher not configured', async () => {
    const { setTokens, refreshAccessToken } = await import('./tokenManager');
    setTokens('access-1', 'refresh-1', 3600);
    await expect(refreshAccessToken()).rejects.toThrow('Refresh token fetcher not configured');
  });

  it('refreshAccessToken calls fetcher and stores new tokens', async () => {
    const { setTokens, setRefreshTokenFetcher, refreshAccessToken, getAccessToken } = await import('./tokenManager');

    setTokens('old-access', 'refresh-1', 3600, 86400);

    setRefreshTokenFetcher(async () => ({
      accessToken: 'new-access',
      expiresIn: 7200,
    }));

    const result = await refreshAccessToken();
    expect(result).toBe('new-access');
    expect(getAccessToken()).toBe('new-access');
  });

  it('getValidToken returns access token without refresh when not expiring', async () => {
    const { setTokens, getValidToken } = await import('./tokenManager');
    setTokens('access-1', 'refresh-1', 999999, 999999);
    const result = await getValidToken();
    expect(result).toBe('access-1');
  });

  it('getValidToken returns undefined when enableAutoRefresh is false', async () => {
    mockConfig.enableAutoRefresh = false;
    const { setTokens, getValidToken } = await import('./tokenManager');
    setTokens('access-1', undefined, 999999);
    const result = await getValidToken();
    expect(result).toBe('access-1');
  });
});
