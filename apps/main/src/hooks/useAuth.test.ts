import { describe, expect, it, beforeEach } from 'vitest';
import { useAuthStore } from '../store/authStore';

describe('useAuth (store-level)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      token: undefined,
      tokens: undefined,
      bootstrapStatus: 'idle',
    });
  });

  it('returns default auth state', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.bootstrapStatus).toBe('idle');
  });

  it('reflects updated store state after login', () => {
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
});

describe('useAuthBootstrap (store-level)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      token: undefined,
      tokens: undefined,
      bootstrapStatus: 'idle',
    });
  });

  it('returns bootstrap status from store', () => {
    const state = useAuthStore.getState();
    expect(state.bootstrapStatus).toBe('idle');
    expect(state.isAuthenticated).toBe(false);
  });
});
