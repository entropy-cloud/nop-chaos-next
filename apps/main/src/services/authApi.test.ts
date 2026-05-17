import { beforeEach, describe, expect, it, vi } from 'vitest';

const ajaxFetch = vi.fn();
const ajaxQuery = vi.fn();

vi.mock('./http', () => ({
  ajaxFetch,
  ajaxQuery,
}));

describe('authApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    ajaxFetch.mockReset();
    ajaxQuery.mockReset();
  });

  it('uses mock auth flow without backend HTTP when enabled', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'true');

    const { fetchCurrentUser, loginWithPassword, logoutRequest } = await import('./authApi');
    const session = await loginWithPassword('nop', '123');

    expect(session.token).toBe('mock-token:nop');
    expect(session.user.username).toBe('nop');
    expect(ajaxFetch).not.toHaveBeenCalled();

    const user = await fetchCurrentUser('legacy-real-token');

    expect(user.username).toBe('nop');
    expect(ajaxQuery).not.toHaveBeenCalled();

    await logoutRequest('legacy-real-token');

    expect(ajaxQuery).not.toHaveBeenCalled();
  });

  it('delegates login to backend HTTP when mock mode is disabled', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'false');
    ajaxFetch.mockResolvedValue({
      accessToken: 'real-token',
      userInfo: {
        username: 'alice',
        nickname: 'Alice',
        roles: [{ value: 'admin' }],
      },
    });

    const { loginWithPassword } = await import('./authApi');
    const session = await loginWithPassword('alice', 'secret');

    expect(ajaxFetch).toHaveBeenCalledOnce();
    expect(session).toEqual({
      token: 'real-token',
      tokens: {
        accessToken: 'real-token',
        expiresAt: undefined,
        refreshToken: undefined,
        refreshExpiresAt: undefined,
      },
      user: {
        id: 'alice',
        username: 'alice',
        nickname: 'Alice',
        avatar: undefined,
        email: undefined,
        roles: ['admin'],
      },
    });
  });

  describe('real-path: fetchCurrentUser', () => {
    it('calls ajaxQuery and normalizes the user', async () => {
      vi.stubEnv('VITE_ENABLE_MOCK', 'false');
      ajaxQuery.mockResolvedValue({
        username: 'bob',
        realname: 'Bob Real',
        email: 'bob@test.com',
        roles: [{ value: 'editor' }, { value: 'viewer' }],
      });

      const { fetchCurrentUser } = await import('./authApi');
      const user = await fetchCurrentUser('tok-123');

      expect(ajaxQuery).toHaveBeenCalledOnce();
      expect(user).toEqual({
        id: 'bob',
        username: 'bob',
        nickname: 'Bob Real',
        avatar: undefined,
        email: 'bob@test.com',
        roles: ['editor', 'viewer'],
      });
    });

    it('normalizes user with userName and nickName fallbacks', async () => {
      vi.stubEnv('VITE_ENABLE_MOCK', 'false');
      ajaxQuery.mockResolvedValue({
        userName: 'u-name',
        nickName: 'Nick',
        roles: [],
      });

      const { fetchCurrentUser } = await import('./authApi');
      const user = await fetchCurrentUser('tok');

      expect(user.id).toBe('u-name');
      expect(user.username).toBe('u-name');
      expect(user.nickname).toBe('Nick');
    });

    it('normalizes user with unknown default when no username fields', async () => {
      vi.stubEnv('VITE_ENABLE_MOCK', 'false');
      ajaxQuery.mockResolvedValue({ roles: [] });

      const { fetchCurrentUser } = await import('./authApi');
      const user = await fetchCurrentUser('tok');

      expect(user.username).toBe('unknown');
      expect(user.id).toBe('unknown');
    });

    it('filters out falsy role values', async () => {
      vi.stubEnv('VITE_ENABLE_MOCK', 'false');
      ajaxQuery.mockResolvedValue({
        username: 'r',
        roles: [{ value: 'admin' }, { value: '' }, { value: undefined }, { roleName: 'x' }],
      });

      const { fetchCurrentUser } = await import('./authApi');
      const user = await fetchCurrentUser('tok');

      expect(user.roles).toEqual(['admin']);
    });

    it('returns empty roles when roles is not an array', async () => {
      vi.stubEnv('VITE_ENABLE_MOCK', 'false');
      ajaxQuery.mockResolvedValue({ username: 'noroles' });

      const { fetchCurrentUser } = await import('./authApi');
      const user = await fetchCurrentUser('tok');

      expect(user.roles).toEqual([]);
    });
  });

  describe('real-path: loginWithPassword without userInfo', () => {
    it('falls back to fetchCurrentUser when no userInfo', async () => {
      vi.stubEnv('VITE_ENABLE_MOCK', 'false');
      ajaxFetch.mockResolvedValue({
        accessToken: 'tok-no-ui',
        expiresIn: 3600,
        refreshToken: 'rt',
        refreshExpiresIn: 86400,
      });
      ajaxQuery.mockResolvedValue({ username: 'deferred', roles: [] });

      const { loginWithPassword } = await import('./authApi');
      const session = await loginWithPassword('deferred', 'pw');

      expect(session.token).toBe('tok-no-ui');
      expect(session.user.username).toBe('deferred');
      expect(session.tokens?.refreshToken).toBe('rt');
      expect(session.tokens?.expiresAt).toBeGreaterThan(Date.now() - 1000);
    });

    it('throws when response has no accessToken', async () => {
      vi.stubEnv('VITE_ENABLE_MOCK', 'false');
      ajaxFetch.mockResolvedValue({});

      const { loginWithPassword } = await import('./authApi');
      await expect(loginWithPassword('x', 'y')).rejects.toThrow(
        'Login response does not contain a token',
      );
    });
  });

  describe('real-path: refreshAccessToken', () => {
    it('refreshes token via ajaxFetch', async () => {
      vi.stubEnv('VITE_ENABLE_MOCK', 'false');
      ajaxFetch.mockResolvedValue({
        accessToken: 'new-access',
        expiresIn: 300,
        refreshToken: 'new-refresh',
        refreshExpiresIn: 86400,
      });

      const { refreshAccessToken } = await import('./authApi');
      const result = await refreshAccessToken('old-refresh');

      expect(result).toEqual({
        accessToken: 'new-access',
        expiresIn: 300,
        refreshToken: 'new-refresh',
        refreshExpiresIn: 86400,
      });
    });

    it('throws when refresh response has no accessToken', async () => {
      vi.stubEnv('VITE_ENABLE_MOCK', 'false');
      ajaxFetch.mockResolvedValue({});

      const { refreshAccessToken } = await import('./authApi');
      await expect(refreshAccessToken('rt')).rejects.toThrow(
        'Refresh token response does not contain a token',
      );
    });
  });

  describe('real-path: logoutRequest', () => {
    it('does nothing when no token', async () => {
      vi.stubEnv('VITE_ENABLE_MOCK', 'false');

      const { logoutRequest } = await import('./authApi');
      await logoutRequest();

      expect(ajaxQuery).not.toHaveBeenCalled();
    });

    it('calls ajaxQuery with token when provided', async () => {
      vi.stubEnv('VITE_ENABLE_MOCK', 'false');
      ajaxQuery.mockResolvedValue(undefined);

      const { logoutRequest } = await import('./authApi');
      await logoutRequest('my-token');

      expect(ajaxQuery).toHaveBeenCalledOnce();
      const call = ajaxQuery.mock.calls[0];
      expect(call[0]).toContain('logout');
      expect(call[1]).toEqual({ accessToken: 'my-token' });
    });
  });
});
