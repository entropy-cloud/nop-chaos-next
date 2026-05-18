import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './authStore';

const mockClearTokens = vi.fn();
const mockSetTokens = vi.fn();

vi.mock('@nop-chaos/shared', async () => {
  const actual = await vi.importActual<typeof import('@nop-chaos/shared')>('@nop-chaos/shared');

  return {
    ...actual,
    clearTokens: (...args: Parameters<typeof mockClearTokens>) => mockClearTokens(...args),
    setTokens: (...args: Parameters<typeof mockSetTokens>) => mockSetTokens(...args),
  };
});

describe('authStore', () => {
  beforeEach(() => {
    mockClearTokens.mockReset();
    mockSetTokens.mockReset();
    sessionStorage.removeItem('auth:v2');
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      token: undefined,
      tokens: undefined,
      bootstrapStatus: 'idle',
    });
  });

  it('starts with idle bootstrap status', () => {
    const state = useAuthStore.getState();
    expect(state.bootstrapStatus).toBe('idle');
    expect(state.isAuthenticated).toBe(false);
  });

  it('login sets user and authenticated state', () => {
    useAuthStore.getState().login({
      user: { id: '1', username: 'test', roles: ['admin'] },
      token: 'abc',
      tokens: { accessToken: 'abc' },
    });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.username).toBe('test');
    expect(state.token).toBe('abc');
    expect(state.bootstrapStatus).toBe('ready');
    expect(mockSetTokens).toHaveBeenCalledWith('abc', undefined, undefined, undefined);
  });

  it('logout resets to initial state with anonymous bootstrap', () => {
    useAuthStore.getState().login({
      user: { id: '1', username: 'test', roles: ['admin'] },
      token: 'abc',
    });

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.token).toBeUndefined();
    expect(state.bootstrapStatus).toBe('anonymous');
    expect(mockClearTokens).toHaveBeenCalledTimes(1);
  });

  it('setBootstrapStatus updates status', () => {
    useAuthStore.getState().setBootstrapStatus('pending');
    expect(useAuthStore.getState().bootstrapStatus).toBe('pending');

    useAuthStore.getState().setBootstrapStatus('error');
    expect(useAuthStore.getState().bootstrapStatus).toBe('error');
  });

  it('setTokens stores token with expiry', () => {
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('access123', 'refresh123', 3600, 86400);

    const state = useAuthStore.getState();
    expect(state.token).toBe('access123');
    expect(state.tokens?.accessToken).toBe('access123');
    expect(state.tokens?.refreshToken).toBe('refresh123');
    expect(state.tokens?.expiresAt).toBeGreaterThan(Date.now());
  });

  it('clearTokens removes tokens and sets unauthenticated', () => {
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('access123');

    useAuthStore.getState().clearTokens();

    const state = useAuthStore.getState();
    expect(state.token).toBeUndefined();
    expect(state.tokens).toBeUndefined();
    expect(state.isAuthenticated).toBe(false);
    expect(mockClearTokens).toHaveBeenCalledTimes(1);
  });

  it('setSession syncs managed tokens', () => {
    useAuthStore.getState().setSession({
      user: { id: '1', username: 'test', roles: ['admin'] },
      token: 'session-token',
      tokens: {
        accessToken: 'session-token',
        refreshToken: 'refresh-token',
        expiresAt: Date.now() + 3600_000,
        refreshExpiresAt: Date.now() + 7200_000,
      },
    });

    expect(mockSetTokens).toHaveBeenCalledWith(
      'session-token',
      'refresh-token',
      expect.any(Number),
      expect.any(Number),
    );
  });

  it('setToken creates tokens when store only has bare token mirror', () => {
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });

    useAuthStore.getState().setToken('header-token');

    const state = useAuthStore.getState();
    expect(state.token).toBe('header-token');
    expect(state.tokens?.accessToken).toBe('header-token');
    expect(mockSetTokens).toHaveBeenCalledWith('header-token', undefined, undefined, undefined);
  });

  it('getRefreshToken returns undefined when no tokens', () => {
    expect(useAuthStore.getState().getRefreshToken()).toBeUndefined();
  });

  it('persisted payload omits refresh token by default', () => {
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('access123', 'refresh123', 3600, 86400);

    const persistedRaw = sessionStorage.getItem('auth:v2');
    expect(persistedRaw).toBeTruthy();

    const persisted = JSON.parse(persistedRaw as string) as {
      state: { tokens?: { accessToken?: string; refreshToken?: string } };
    };

    expect(persisted.state.tokens?.accessToken).toBe('access123');
    expect(persisted.state.tokens?.refreshToken).toBeUndefined();
  });
});
