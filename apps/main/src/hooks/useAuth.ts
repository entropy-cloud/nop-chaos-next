import { useEffect } from 'react'
import { fetchCurrentUser } from '../services/authApi'
import { useAuthStore } from '../store/authStore'

let didBootstrapAuth = false

export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const token = useAuthStore((state) => state.token)
  const bootstrapStatus = useAuthStore((state) => state.bootstrapStatus)
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)

  return { user, isAuthenticated, token, bootstrapStatus, login, logout }
}

export function useAuthBootstrap() {
  useEffect(() => {
    if (didBootstrapAuth) {
      return
    }

    didBootstrapAuth = true

    const bootstrap = async () => {
      const state = useAuthStore.getState()

      if (!state.token) {
        state.setBootstrapStatus('anonymous')
        return
      }

      try {
        state.setBootstrapStatus('pending')
        const user = await fetchCurrentUser(state.token)
        useAuthStore.getState().setSession({
          user,
          token: state.token,
          tokens: state.tokens
        })
      } catch {
        useAuthStore.getState().logout()
      }
    }

    void bootstrap()
  }, [])
}
