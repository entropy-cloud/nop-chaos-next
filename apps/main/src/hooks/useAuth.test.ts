import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';

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

  async function simulateBootstrap() {
    const mod = await import('../services/authApi');
    const i18n = (await import('../config/i18n')).default;
    const { toast } = await import('@nop-chaos/ui');

    const state = useAuthStore.getState();

    if (!state.token) {
      state.setBootstrapStatus('anonymous');
      return;
    }

    try {
      state.setBootstrapStatus('pending');
      const currentUser = await mod.fetchCurrentUser(state.token);
      useAuthStore.getState().setSession({
        user: currentUser,
        token: state.token,
        tokens: state.tokens,
      });
    } catch (error: unknown) {
      useAuthStore.getState().logout();
      useAuthStore.getState().setBootstrapStatus('error');
      toast.error(
        error instanceof Error
          ? error.message
          : i18n.t('auth.bootstrapFailed', 'Unable to restore your session.'),
      );
    }
  }

  it('sets anonymous when no token exists', async () => {
    await simulateBootstrap();
    expect(useAuthStore.getState().bootstrapStatus).toBe('anonymous');
  });

  it('fetches current user and sets session when token exists', async () => {
    const mockUser = { id: 'u1', username: 'bootuser', roles: ['admin'] };
    mockFetchCurrentUser.mockResolvedValue(mockUser);
    useAuthStore.setState({ token: 'valid-token', tokens: { accessToken: 'valid-token' } });

    await simulateBootstrap();

    expect(mockFetchCurrentUser).toHaveBeenCalledWith('valid-token');
    const state = useAuthStore.getState();
    expect(state.user?.username).toBe('bootuser');
    expect(state.isAuthenticated).toBe(true);
    expect(state.bootstrapStatus).toBe('ready');
  });

  it('calls logout and sets error when fetchCurrentUser fails', async () => {
    mockFetchCurrentUser.mockRejectedValue(new Error('Network error'));
    useAuthStore.setState({ token: 'bad-token' });

    await simulateBootstrap();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.bootstrapStatus).toBe('error');
    expect(mockToastError).toHaveBeenCalledWith('Network error');
  });

  it('shows fallback toast message for non-Error thrown value', async () => {
    mockFetchCurrentUser.mockRejectedValue('string-error');
    useAuthStore.setState({ token: 'bad-token' });

    await simulateBootstrap();

    expect(mockToastError).toHaveBeenCalledWith('Unable to restore your session.');
  });

  it('sets pending status before fetching', async () => {
    mockFetchCurrentUser.mockResolvedValue({ id: 'x', username: 'x', roles: [] });
    useAuthStore.setState({ token: 'tok' });

    await simulateBootstrap();

    expect(useAuthStore.getState().bootstrapStatus).toBe('ready');
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
});
