import { getAuthConfig } from '@nop-chaos/shared';
import type { AuthSession, AuthTokens, User } from '@nop-chaos/shared';
import { isMockEnabled } from '../config/env';
import { ajaxFetch, ajaxQuery } from './http';
import {
  fetchMockCurrentUser,
  mockLoginWithPassword,
  mockLogoutRequest,
  mockRefreshAccessToken,
} from './mockApi/auth';

interface LoginApiResponse {
  accessToken?: string;
  expiresIn?: number;
  refreshToken?: string;
  refreshExpiresIn?: number;
  userInfo?: LegacyUserInfoResponse;
}

interface LegacyRoleInfo {
  value?: string;
  roleName?: string;
}

interface LegacyUserInfoResponse {
  username?: string;
  userName?: string;
  realname?: string;
  nickName?: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  roles?: LegacyRoleInfo[];
}

export interface RefreshAccessTokenResult {
  accessToken: string;
  expiresIn: number;
  refreshToken?: string;
  refreshExpiresIn?: number;
}

function normalizeUser(payload: LegacyUserInfoResponse): User {
  const username = payload.username ?? payload.userName ?? 'unknown';
  const roles = Array.isArray(payload.roles)
    ? payload.roles.map((item) => item.value).filter((value): value is string => Boolean(value))
    : [];

  return {
    id: username,
    username,
    nickname: payload.nickname ?? payload.nickName ?? payload.realname,
    avatar: payload.avatar,
    email: payload.email,
    roles,
  };
}

function buildTokenHeaders(token?: string) {
  if (!token) {
    return undefined;
  }

  return {
    'x-access-token': token,
    authorization: `Bearer ${token}`,
  };
}

function buildTokens(payload: LoginApiResponse, token: string): AuthTokens {
  const now = Date.now();

  return {
    accessToken: token,
    refreshToken: payload.refreshToken,
    expiresAt: payload.expiresIn ? now + payload.expiresIn * 1000 : undefined,
    refreshExpiresAt: payload.refreshExpiresIn ? now + payload.refreshExpiresIn * 1000 : undefined,
  };
}

export async function fetchCurrentUser(token?: string): Promise<User> {
  if (isMockEnabled()) {
    return fetchMockCurrentUser(token);
  }

  const payload = await ajaxQuery<LegacyUserInfoResponse>(
    '@query:LoginApi__getLoginUserInfo/username:userName,realname:nickName,roles:roleInfos{value:roleId,roleName}',
    {
      accessToken: token,
    },
    {
      withAuth: false,
      headers: buildTokenHeaders(token),
    },
  );

  return normalizeUser(payload);
}

export async function loginWithPassword(username: string, password: string): Promise<AuthSession> {
  if (isMockEnabled()) {
    return mockLoginWithPassword(username, password);
  }

  const loginResponse = await ajaxFetch<LoginApiResponse>(
    '/r/LoginApi__login?@selection=accessToken,expiresIn,refreshToken,refreshExpiresIn,userInfo',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      withAuth: false,
      data: {
        loginType: 1,
        principalId: username,
        principalSecret: password,
      },
    },
  );

  const token = loginResponse.accessToken;

  if (!token) {
    throw new Error('Login response does not contain a token');
  }

  const user = loginResponse.userInfo
    ? normalizeUser(loginResponse.userInfo)
    : await fetchCurrentUser(token);

  return {
    user,
    token,
    tokens: buildTokens(loginResponse, token),
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshAccessTokenResult> {
  if (isMockEnabled()) {
    return mockRefreshAccessToken(refreshToken);
  }

  const config = getAuthConfig();
  const response = await ajaxFetch<LoginApiResponse>(config.refreshTokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    withAuth: false,
    data: {
      refreshToken,
    },
  });

  const token = response.accessToken;

  if (!token) {
    throw new Error('Refresh token response does not contain a token');
  }

  return {
    accessToken: token,
    expiresIn: response.expiresIn ?? 0,
    refreshToken: response.refreshToken,
    refreshExpiresIn: response.refreshExpiresIn,
  };
}

export async function logoutRequest(token?: string): Promise<void> {
  if (isMockEnabled()) {
    await mockLogoutRequest();
    return;
  }

  if (!token) {
    return;
  }

  await ajaxQuery<unknown>(
    '@mutation:LoginApi__logout',
    {
      accessToken: token,
    },
    {
      withAuth: false,
      headers: buildTokenHeaders(token),
    },
  );
}
