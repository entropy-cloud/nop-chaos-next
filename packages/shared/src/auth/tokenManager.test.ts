import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const mockConfig: {
  tokenStorage: string;
  tokenRefreshBeforeExpiry: number;
  enableAutoRefresh: boolean;
  persistRefreshToken: boolean;
} = {
  tokenStorage: 'memory',
  tokenRefreshBeforeExpiry: 60,
  enableAutoRefresh: true,
  persistRefreshToken: false,
};

vi.mock('./config', () => ({
  getAuthConfig: () => mockConfig,
}));

function encodeJwtPayload(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
  const sig = btoa('signature');
  return `${header}.${body}.${sig}`;
}

describe('tokenManager', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConfig.tokenStorage = 'memory';
    mockConfig.enableAutoRefresh = true;
    mockConfig.persistRefreshToken = false;
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

  describe('decodeJwtPayload', () => {
    it('decodes a valid JWT payload', async () => {
      const { decodeJwtPayload } = await import('./tokenManager');
      const token = encodeJwtPayload({ sub: 'user1', exp: 1700000000 });
      const payload = decodeJwtPayload(token);
      expect(payload).toMatchObject({ sub: 'user1', exp: 1700000000 });
    });

    it('returns null for invalid JWT with wrong number of parts', async () => {
      const { decodeJwtPayload } = await import('./tokenManager');
      expect(decodeJwtPayload('not.a.valid.jwt')).toBeNull();
    });

    it('returns null for JWT with only two parts', async () => {
      const { decodeJwtPayload } = await import('./tokenManager');
      expect(decodeJwtPayload('header.payload')).toBeNull();
    });

    it('returns null for empty string', async () => {
      const { decodeJwtPayload } = await import('./tokenManager');
      expect(decodeJwtPayload('')).toBeNull();
    });

    it('handles base64url encoding with - and _', async () => {
      const { decodeJwtPayload } = await import('./tokenManager');
      const payload = { sub: 'test', data: 'a+b/c=d' };
      const token = encodeJwtPayload(payload);
      const decoded = decodeJwtPayload(token);
      expect(decoded).toMatchObject(payload);
    });
  });

  describe('getTokenExpiry', () => {
    it('returns expiry in milliseconds from JWT exp claim', async () => {
      const { getTokenExpiry } = await import('./tokenManager');
      const token = encodeJwtPayload({ exp: 1700000000 });
      expect(getTokenExpiry(token)).toBe(1700000000 * 1000);
    });

    it('returns null when exp is not present', async () => {
      const { getTokenExpiry } = await import('./tokenManager');
      const token = encodeJwtPayload({ sub: 'user1' });
      expect(getTokenExpiry(token)).toBeNull();
    });

    it('returns null for invalid JWT', async () => {
      const { getTokenExpiry } = await import('./tokenManager');
      expect(getTokenExpiry('invalid')).toBeNull();
    });

    it('returns null when exp is not a number', async () => {
      const { getTokenExpiry } = await import('./tokenManager');
      const token = encodeJwtPayload({ exp: 'not-a-number' });
      expect(getTokenExpiry(token)).toBeNull();
    });
  });

  describe('createTokenStorage - web storage', () => {
    it('creates sessionStorage-based storage', async () => {
      mockConfig.tokenStorage = 'sessionStorage';
      const { setTokens, getAccessToken, clearTokens, getRefreshToken } = await import('./tokenManager');

      const store = new Map<string, string>();
      const mockStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        get length() { return store.size; },
        clear: () => store.clear(),
        key: () => null,
      };
      vi.stubGlobal('sessionStorage', mockStorage);

      setTokens('web-access', 'web-refresh', 3600);
      expect(getAccessToken()).toBe('web-access');
      expect(getRefreshToken()).toBeUndefined();

      clearTokens();
      expect(getAccessToken()).toBeUndefined();
    });

    it('creates localStorage-based storage', async () => {
      mockConfig.tokenStorage = 'localStorage';
      const { setTokens, getAccessToken } = await import('./tokenManager');

      const store = new Map<string, string>();
      const mockStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        get length() { return store.size; },
        clear: () => store.clear(),
        key: () => null,
      };
      vi.stubGlobal('localStorage', mockStorage);

      setTokens('local-access', undefined, 3600);
      expect(getAccessToken()).toBe('local-access');
    });

    it('persists refresh token when config enabled', async () => {
      mockConfig.tokenStorage = 'memory';
      mockConfig.persistRefreshToken = true;
      const { setTokens, getRefreshToken } = await import('./tokenManager');

      setTokens('access', 'my-refresh', 3600, 86400);
      expect(getRefreshToken()).toBe('my-refresh');
    });

    it('creates none storage that always returns null', async () => {
      mockConfig.tokenStorage = 'none';
      const { setTokens, getAccessToken } = await import('./tokenManager');

      setTokens('token', undefined, 3600);
      expect(getAccessToken()).toBeUndefined();
    });

    it('handles corrupted JSON in storage gracefully', async () => {
      mockConfig.tokenStorage = 'sessionStorage';
      const store = new Map<string, string>();
      store.set('auth:tokens:v1', 'not-valid-json');
      const mockStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
        get length() { return store.size; },
        clear: () => store.clear(),
        key: () => null,
      };
      vi.stubGlobal('sessionStorage', mockStorage);

      const { getAccessToken } = await import('./tokenManager');
      expect(getAccessToken()).toBeUndefined();
    });
  });

  describe('getValidToken auto-refresh', () => {
    it('triggers auto-refresh when token is expiring soon', async () => {
      const { setTokens, setRefreshTokenFetcher, getValidToken } = await import('./tokenManager');

      setTokens('expiring-access', 'refresh-1', 30, 86400);

      setRefreshTokenFetcher(async () => ({
        accessToken: 'refreshed-access',
        expiresIn: 3600,
      }));

      const result = await getValidToken();
      expect(result).toBe('refreshed-access');
    });

    it('returns current access token when refresh fails', async () => {
      const { setTokens, setRefreshTokenFetcher, getValidToken } = await import('./tokenManager');

      setTokens('expiring-access', 'refresh-1', 30, 86400);

      setRefreshTokenFetcher(async () => {
        throw new Error('network error');
      });

      const result = await getValidToken();
      expect(result).toBe('expiring-access');
    });

    it('deduplicates concurrent refresh calls', async () => {
      let resolveRefresh: (value: { accessToken: string; expiresIn: number }) => void;
      let fetchCount = 0;

      const mod = await import('./tokenManager');

      mod.setTokens('expiring-access', 'refresh-1', 30, 86400);

      mod.setRefreshTokenFetcher(
        () =>
          new Promise<{ accessToken: string; expiresIn: number }>((resolve) => {
            fetchCount++;
            resolveRefresh = resolve;
          }),
      );

      const p1 = mod.getValidToken();
      const p2 = mod.getValidToken();

      resolveRefresh!({ accessToken: 'new-token', expiresIn: 3600 });
      const [r1, r2] = await Promise.all([p1, p2]);
      expect(r1).toBe('new-token');
      expect(r2).toBe('new-token');
      expect(fetchCount).toBe(1);
    });

    it('returns access token when not expiring and auto-refresh enabled', async () => {
      const { setTokens, getValidToken } = await import('./tokenManager');
      setTokens('fresh-access', undefined, 999999);
      const result = await getValidToken();
      expect(result).toBe('fresh-access');
    });

    it('returns undefined when no token and auto-refresh enabled', async () => {
      const { getValidToken } = await import('./tokenManager');
      const result = await getValidToken();
      expect(result).toBeUndefined();
    });
  });

  describe('clearTokens', () => {
    it('clears stored tokens', async () => {
      const { setTokens, getAccessToken, clearTokens } = await import('./tokenManager');
      setTokens('access-1', 'refresh-1', 3600);
      expect(getAccessToken()).toBe('access-1');
      clearTokens();
      expect(getAccessToken()).toBeUndefined();
    });
  });

  describe('getRefreshToken', () => {
    it('returns refresh token when set', async () => {
      const { setTokens, getRefreshToken } = await import('./tokenManager');
      setTokens('access-1', 'my-refresh', 3600);
      expect(getRefreshToken()).toBe('my-refresh');
    });

    it('returns undefined when no tokens', async () => {
      const { getRefreshToken } = await import('./tokenManager');
      expect(getRefreshToken()).toBeUndefined();
    });
  });

  describe('isTokenExpiringSoon', () => {
    it('returns true when token is within buffer', async () => {
      const { setTokens, isTokenExpiringSoon } = await import('./tokenManager');
      setTokens('access-1', 'refresh-1', 30);
      expect(isTokenExpiringSoon()).toBe(true);
    });

    it('returns false when token is fresh', async () => {
      const { setTokens, isTokenExpiringSoon } = await import('./tokenManager');
      setTokens('access-1', 'refresh-1', 999999);
      expect(isTokenExpiringSoon()).toBe(false);
    });
  });

  describe('isTokenExpired', () => {
    it('returns false for fresh token', async () => {
      const { setTokens, isTokenExpired } = await import('./tokenManager');
      setTokens('access-1', 'refresh-1', 999999);
      expect(isTokenExpired()).toBe(false);
    });

    it('returns true for expired token', async () => {
      const { setTokens, isTokenExpired } = await import('./tokenManager');
      setTokens('access-1', 'refresh-1', -1);
      expect(isTokenExpired()).toBe(true);
    });
  });

  describe('resetTokenStorage', () => {
    it('resets storage so next call creates new storage', async () => {
      const mod = await import('./tokenManager');
      mod.setTokens('access-1', undefined, 3600);
      expect(mod.getAccessToken()).toBe('access-1');
      mod.resetTokenStorage();
      expect(mod.getAccessToken()).toBeUndefined();
    });
  });
});
