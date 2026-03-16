import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { AuthState, User } from '@nop-chaos/shared'

interface AuthStore extends AuthState {
  login: (payload: { user: User; token: string }) => void
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
      login: ({ user, token }) =>
        set({
          user,
          token,
          isAuthenticated: true
        }),
      logout: () => set(initialState)
    }),
    {
      name: 'auth:v1',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
