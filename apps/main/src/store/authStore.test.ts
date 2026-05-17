import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
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
