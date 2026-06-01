import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken } from '@nop-chaos/shared';
import { useAuthStore } from '../store/authStore';
import { restoreAuthSession } from './useAuth';

const mockFetchCurrentUser = vi.fn();
const mockToastError = vi.fn();

vi.mock('../services/authApi', () => ({
  fetchCurrentUser: (...args: unknown[]) => mockFetchCurrentUser(...args),
}));

vi.mock('@nop-chaos/ui', () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
}));

vi.mock('../config/i18n', () => ({
  default: { t: (_key: string, fallback: string) => fallback },
}));

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

describe('useAuthBootstrap logic (store-level)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      token: undefined,
      tokens: undefined,
      bootstrapStatus: 'idle',
    });
    mockFetchCurrentUser.mockReset();
    mockToastError.mockReset();
  });

  it('sets anonymous when no token exists', async () => {
    await restoreAuthSession();
    expect(useAuthStore.getState().bootstrapStatus).toBe('anonymous');
  });

  it('fetches current user and sets session when token exists', async () => {
    const mockUser = { id: 'u1', username: 'bootuser', roles: ['admin'] };
    mockFetchCurrentUser.mockResolvedValue(mockUser);
    useAuthStore.setState({ token: 'valid-token', tokens: { accessToken: 'valid-token' } });

    await restoreAuthSession();

    expect(mockFetchCurrentUser).toHaveBeenCalledWith('valid-token');
    const state = useAuthStore.getState();
    expect(state.user?.username).toBe('bootuser');
    expect(state.isAuthenticated).toBe(true);
    expect(state.bootstrapStatus).toBe('ready');
  });

  it('prefers stored tokens.accessToken during session restore', async () => {
    mockFetchCurrentUser.mockResolvedValue({ id: 'u1', username: 'bootuser', roles: ['admin'] });
    useAuthStore.setState({
      token: 'stale-token',
      tokens: { accessToken: 'managed-token', refreshToken: 'refresh-token' },
    });

    await restoreAuthSession();

    expect(mockFetchCurrentUser).toHaveBeenCalledWith('managed-token');
  });

  it('calls logout and sets error when fetchCurrentUser fails', async () => {
    mockFetchCurrentUser.mockRejectedValue(new Error('Network error'));
    useAuthStore.setState({ token: 'bad-token' });

    await restoreAuthSession();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.bootstrapStatus).toBe('error');
    expect(mockToastError).toHaveBeenCalledWith('Network error');
  });

  it('shows fallback toast message for non-Error thrown value', async () => {
    mockFetchCurrentUser.mockRejectedValue('string-error');
    useAuthStore.setState({ token: 'bad-token' });

    await restoreAuthSession();

    expect(mockToastError).toHaveBeenCalledWith('Unable to restore your session.');
  });

  it('sets pending status before fetching', async () => {
    mockFetchCurrentUser.mockResolvedValue({ id: 'x', username: 'x', roles: [] });
    useAuthStore.setState({ token: 'tok' });

    await restoreAuthSession();

    expect(useAuthStore.getState().bootstrapStatus).toBe('ready');
  });

  it('ignores stale bootstrap responses after token ownership changes', async () => {
    let resolveUser: ((value: { id: string; username: string; roles: string[] }) => void) | undefined;
    mockFetchCurrentUser.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUser = resolve;
        }),
    );

    useAuthStore.setState({
      token: 'original-token',
      tokens: { accessToken: 'original-token', refreshToken: 'original-refresh' },
    });

    const restorePromise = restoreAuthSession();
    useAuthStore.getState().setTokens('next-token', 'next-refresh', 3600, 7200);
    resolveUser?.({ id: 'u1', username: 'stale-user', roles: ['admin'] });
    await restorePromise;

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBe('next-token');
  });
});

describe('useAuth hook', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      token: undefined,
      tokens: undefined,
      bootstrapStatus: 'idle',
    });
  });

  it('reads store state through selector pattern', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeUndefined();
    expect(state.bootstrapStatus).toBe('idle');

    expect(typeof state.login).toBe('function');
    expect(typeof state.logout).toBe('function');
  });

  it('keeps shared token manager synchronized through store writes', () => {
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('sync-token', 'sync-refresh', 3600, 7200);

    expect(getAccessToken()).toBe('sync-token');

    useAuthStore.getState().clearTokens();
    expect(getAccessToken()).toBeUndefined();
  });
});
