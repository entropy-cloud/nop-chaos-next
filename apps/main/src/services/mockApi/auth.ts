import type { AuthSession, User } from '@nop-chaos/shared'
import { wait } from './shared'

const DEFAULT_MOCK_USERNAME = 'nop'
const MOCK_TOKEN_PREFIX = 'mock-token:'

function resolveMockUsername(token?: string) {
  if (!token || !token.startsWith(MOCK_TOKEN_PREFIX)) {
    return DEFAULT_MOCK_USERNAME
  }

  const encodedUsername = token.slice(MOCK_TOKEN_PREFIX.length)

  return decodeURIComponent(encodedUsername) || DEFAULT_MOCK_USERNAME
}

function buildMockUser(username: string): User {
  return {
    id: username,
    username,
    nickname: username === DEFAULT_MOCK_USERNAME ? 'NOP Mock User' : `${username} Mock User`,
    email: `${username}@mock.local`,
    roles: ['admin', 'developer']
  }
}

export async function fetchMockCurrentUser(token?: string): Promise<User> {
  return wait(buildMockUser(resolveMockUsername(token)), 80)
}

export async function mockLoginWithPassword(username: string, password: string): Promise<AuthSession> {
  const normalizedUsername = username.trim() || DEFAULT_MOCK_USERNAME

  if (!password.trim()) {
    throw new Error('Password is required in mock mode')
  }

  return wait({
    user: buildMockUser(normalizedUsername),
    token: `${MOCK_TOKEN_PREFIX}${encodeURIComponent(normalizedUsername)}`
  }, 120)
}

export async function mockLogoutRequest(): Promise<void> {
  await wait(undefined, 60)
}
