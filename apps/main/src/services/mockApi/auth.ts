import type { AuthSession, AuthTokens, User } from '@nop-chaos/shared';
import { wait } from './shared';

const DEFAULT_MOCK_USERNAME = 'nop';
const MOCK_TOKEN_PREFIX = 'mock-token:';
const MOCK_REFRESH_TOKEN_PREFIX = 'mock-refresh-token:';

function resolveMockUsername(token?: string) {
  if (!token || !token.startsWith(MOCK_TOKEN_PREFIX)) {
    return DEFAULT_MOCK_USERNAME;
  }

  const encodedUsername = token.slice(MOCK_TOKEN_PREFIX.length);

  return decodeURIComponent(encodedUsername) || DEFAULT_MOCK_USERNAME;
}

function buildMockUser(username: string): User {
  return {
    id: username,
    username,
    nickname: username === DEFAULT_MOCK_USERNAME ? 'NOP Mock User' : `${username} Mock User`,
    email: `${username}@mock.local`,
    roles: ['admin', 'developer'],
  };
}

export async function fetchMockCurrentUser(token?: string): Promise<User> {
  return wait(buildMockUser(resolveMockUsername(token)), 80);
}

export async function mockLoginWithPassword(
  username: string,
  password: string,
): Promise<AuthSession> {
  const normalizedUsername = username.trim() || DEFAULT_MOCK_USERNAME;

  if (!password.trim()) {
    throw new Error('Password is required in mock mode');
  }

  const token = `${MOCK_TOKEN_PREFIX}${encodeURIComponent(normalizedUsername)}`;
  const refreshToken = `${MOCK_REFRESH_TOKEN_PREFIX}${encodeURIComponent(normalizedUsername)}`;
  const tokens: AuthTokens = {
    accessToken: token,
    refreshToken,
    expiresAt: Date.now() + 5 * 60 * 1000,
    refreshExpiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };

  return wait(
    {
      user: buildMockUser(normalizedUsername),
      token,
      tokens,
    },
    120,
  );
}

export async function mockRefreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  refreshExpiresIn?: number;
}> {
  const username = refreshToken.startsWith(MOCK_REFRESH_TOKEN_PREFIX)
    ? decodeURIComponent(refreshToken.slice(MOCK_REFRESH_TOKEN_PREFIX.length)) ||
      DEFAULT_MOCK_USERNAME
    : DEFAULT_MOCK_USERNAME;

  return wait(
    {
      accessToken: `${MOCK_TOKEN_PREFIX}${encodeURIComponent(username)}`,
      expiresIn: 5 * 60,
      refreshToken,
      refreshExpiresIn: 24 * 60 * 60,
    },
    80,
  );
}

export async function mockLogoutRequest(): Promise<void> {
  await wait(undefined, 60);
}
