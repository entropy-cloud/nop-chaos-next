import { useEffect } from 'react';
import { toast } from '@nop-chaos/ui';
import i18n from '../config/i18n';
import { fetchCurrentUser } from '../services/authApi';
import { useAuthStore } from '../store/authStore';

const authBootstrapState = {
  didBootstrapAuth: false,
  activeRequestId: 0,
};

function getAuthOwnershipKey() {
  const state = useAuthStore.getState();
  return state.tokens?.refreshToken ?? state.token;
}

export async function restoreAuthSession() {
  const state = useAuthStore.getState();

  if (!state.token) {
    state.setBootstrapStatus('anonymous');
    return;
  }

  const requestId = ++authBootstrapState.activeRequestId;
  const ownershipKey = getAuthOwnershipKey();

  try {
    state.setBootstrapStatus('pending');
    const currentUser = await fetchCurrentUser();
    const nextState = useAuthStore.getState();

    if (authBootstrapState.activeRequestId !== requestId || getAuthOwnershipKey() !== ownershipKey) {
      return;
    }

    nextState.setSession({
      user: currentUser,
      token: nextState.token ?? state.token,
      tokens: nextState.tokens,
    });
  } catch (error: unknown) {
    const nextState = useAuthStore.getState();

    if (authBootstrapState.activeRequestId !== requestId || getAuthOwnershipKey() !== ownershipKey) {
      return;
    }

    nextState.logout();
    nextState.setBootstrapStatus('error');
    toast.error(
      error instanceof Error
        ? error.message
        : i18n.t('auth.bootstrapFailed', 'Unable to restore your session.'),
    );
  }
}

export function useAuth() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const bootstrapStatus = useAuthStore((state) => state.bootstrapStatus);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);

  return { user, isAuthenticated, token, bootstrapStatus, login, logout };
}

export function useAuthBootstrap() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const bootstrapStatus = useAuthStore((state) => state.bootstrapStatus);

  useEffect(() => {
    if (authBootstrapState.didBootstrapAuth) {
      return;
    }

    authBootstrapState.didBootstrapAuth = true;

    void restoreAuthSession();
  }, []);

  return { isAuthenticated, bootstrapStatus, user };
}
