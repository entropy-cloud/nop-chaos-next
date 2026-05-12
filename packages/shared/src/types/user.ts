export interface User {
  id: string;
  username: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  roles: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  refreshExpiresAt?: number;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token?: string;
  tokens?: AuthTokens;
}

export type AuthBootstrapStatus = 'idle' | 'pending' | 'ready' | 'anonymous';

export interface AuthSession {
  user: User;
  token: string;
  tokens?: AuthTokens;
}
