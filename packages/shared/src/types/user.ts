export interface User {
  id: string
  username: string
  nickname?: string
  avatar?: string
  email?: string
  roles: string[]
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  token?: string
}

export type AuthBootstrapStatus = 'idle' | 'pending' | 'ready' | 'anonymous'

export interface AuthSession {
  user: User
  token: string
}
