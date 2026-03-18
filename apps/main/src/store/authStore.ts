import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AuthBootstrapStatus, AuthState, AuthSession, User } from '@nop-chaos/shared'

interface AuthStore extends AuthState {
  bootstrapStatus: AuthBootstrapStatus
  setBootstrapStatus: (status: AuthBootstrapStatus) => void
  login: (payload: AuthSession) => void
  setSession: (payload: AuthSession) => void
  setUser: (user: User | null) => void
  setToken: (token?: string) => void
  logout: () => void
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  token: undefined
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,
      bootstrapStatus: 'idle',
      setBootstrapStatus: (bootstrapStatus) => set({ bootstrapStatus }),
      login: ({ user, token }) =>
        set({
          user,
          token,
          isAuthenticated: true,
          bootstrapStatus: 'ready'
        }),
      setSession: ({ user, token }) =>
        set({
          user,
          token,
          isAuthenticated: true,
          bootstrapStatus: 'ready'
        }),
      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: Boolean(user && state.token)
        })),
      setToken: (token) =>
        set((state) => ({
          token,
          isAuthenticated: Boolean(state.user && token)
        })),
      logout: () => set({ ...initialState, bootstrapStatus: 'anonymous' })
    }),
    {
      name: 'auth:v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token
      })
    }
  )
)
