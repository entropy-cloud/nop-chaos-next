import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AuthBootstrapStatus,
  AuthState,
  AuthSession,
  User,
  AuthTokens,
} from '@nop-chaos/shared';
import { getAuthConfig } from '@nop-chaos/shared';
import { APP_STORAGE_KEYS } from '../constants/storage';

interface AuthStore extends AuthState {
  bootstrapStatus: AuthBootstrapStatus;
  setBootstrapStatus: (status: AuthBootstrapStatus) => void;
  login: (payload: AuthSession) => void;
  setSession: (payload: AuthSession) => void;
  setUser: (user: User | null) => void;
  setToken: (token?: string) => void;
  setTokens: (
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number,
    refreshExpiresIn?: number,
  ) => void;
  getRefreshToken: () => string | undefined;
  clearTokens: () => void;
  logout: () => void;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  token: undefined,
  tokens: undefined,
};

function getStorageType(): 'sessionStorage' | 'localStorage' {
  const config = getAuthConfig();
  if (config.tokenStorage === 'localStorage') {
    return 'localStorage';
  }
  return 'sessionStorage';
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      bootstrapStatus: 'idle',
      setBootstrapStatus: (bootstrapStatus) => set({ bootstrapStatus }),
      login: ({ user, token, tokens }) =>
        set({
          user,
          token,
          tokens,
          isAuthenticated: true,
          bootstrapStatus: 'ready',
        }),
      setSession: ({ user, token, tokens }) =>
        set({
          user,
          token,
          tokens,
          isAuthenticated: true,
          bootstrapStatus: 'ready',
        }),
      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: Boolean(user && state.token),
        })),
      setToken: (token) =>
        set((state) => ({
          token,
          tokens: state.tokens
            ? {
                ...state.tokens,
                accessToken: token ?? state.tokens.accessToken,
              }
            : state.tokens,
          isAuthenticated: Boolean(state.user && token),
        })),
      setTokens: (accessToken, refreshToken?, expiresIn?, refreshExpiresIn?) => {
        const now = Date.now();
        const tokens: AuthTokens = {
          accessToken,
          expiresAt: expiresIn ? now + expiresIn * 1000 : undefined,
          refreshToken,
          refreshExpiresAt: refreshExpiresIn ? now + refreshExpiresIn * 1000 : undefined,
        };
        set((state) => ({
          token: accessToken,
          tokens,
          isAuthenticated: Boolean(state.user && accessToken),
        }));
      },
      getRefreshToken: () => get().tokens?.refreshToken,
      clearTokens: () =>
        set({
          token: undefined,
          tokens: undefined,
          isAuthenticated: false,
        }),
      logout: () => set({ ...initialState, bootstrapStatus: 'anonymous' }),
    }),
    {
      name: APP_STORAGE_KEYS.auth,
      storage: createJSONStorage(() => {
        const storageType = getStorageType();
        return storageType === 'localStorage' ? localStorage : sessionStorage;
      }),
      partialize: (state) => {
        const config = getAuthConfig();
        const result: AuthState = {
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          token: state.token,
        };
        if (state.tokens) {
          if (config.persistRefreshToken) {
            result.tokens = {
              accessToken: state.tokens.accessToken,
              expiresAt: state.tokens.expiresAt,
              refreshToken: state.tokens.refreshToken,
              refreshExpiresAt: state.tokens.refreshExpiresAt,
            };
          } else {
            result.tokens = {
              accessToken: state.tokens.accessToken,
              expiresAt: state.tokens.expiresAt,
            };
          }
        }
        return result;
      },
    },
  ),
);
