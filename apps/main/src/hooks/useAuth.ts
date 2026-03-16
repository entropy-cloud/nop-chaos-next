import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'

let didBootstrapAuth = false

export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const token = useAuthStore((state) => state.token)
  const login = useAuthStore((state) => state.login)
  const logout = useAuthStore((state) => state.logout)

  return { user, isAuthenticated, token, login, logout }
}

export function useAuthBootstrap() {
  useEffect(() => {
    if (didBootstrapAuth) {
      return
    }

    didBootstrapAuth = true
  }, [])
}
