import { useEffect } from 'react';
import { fetchCurrentUser } from '../services/auth-api';
import { useAuthStore } from '../store/auth-store';

let didBootstrapAuth = false;

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
    if (didBootstrapAuth) {
      return;
    }

    didBootstrapAuth = true;

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
      } catch {
        useAuthStore.getState().logout();
      }
    };

    void bootstrap();
  }, []);

  return { isAuthenticated, bootstrapStatus, user };
}
