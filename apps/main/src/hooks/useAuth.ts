import { useEffect } from 'react';
import { toast } from '@nop-chaos/ui';
import i18n from '../config/i18n';
import { fetchCurrentUser } from '../services/authApi';
import { useAuthStore } from '../store/authStore';

const authBootstrapState = {
  didBootstrapAuth: false,
};

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

    const bootstrap = async () => {
      const state = useAuthStore.getState();

      if (!state.token) {
        state.setBootstrapStatus('anonymous');
        return;
      }

      try {
        state.setBootstrapStatus('pending');
        const currentUser = await fetchCurrentUser(state.token);
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
    };

    void bootstrap();
  }, []);

  return { isAuthenticated, bootstrapStatus, user };
}
