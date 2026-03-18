import { isMockEnabled } from '../config/env'
import type { AuthSession, User } from '@nop-chaos/shared'
import { fetchMockCurrentUser, mockLoginWithPassword, mockLogoutRequest } from './mockApi'
import { ajaxFetch, ajaxQuery } from './http'

interface LoginApiResponse {
  token?: string
  accessToken?: string
  userInfo?: LegacyUserInfoResponse
}

interface LegacyRoleInfo {
  value?: string
  roleName?: string
}

interface LegacyUserInfoResponse {
  username?: string
  userName?: string
  realname?: string
  nickName?: string
  nickname?: string
  avatar?: string
  email?: string
  roles?: LegacyRoleInfo[]
}

function normalizeUser(payload: LegacyUserInfoResponse): User {
  const username = payload.username ?? payload.userName ?? 'unknown'
  const roles = Array.isArray(payload.roles)
    ? payload.roles.map((item) => item.value).filter((value): value is string => Boolean(value))
    : []

  return {
    id: username,
    username,
    nickname: payload.nickname ?? payload.nickName ?? payload.realname,
    avatar: payload.avatar,
    email: payload.email,
    roles
  }
}

function buildTokenHeaders(token?: string) {
  if (!token) {
    return undefined
  }

  return {
    'x-access-token': token,
    authorization: `Bearer ${token}`
  }
}

export async function fetchCurrentUser(token?: string): Promise<User> {
  if (isMockEnabled()) {
    return fetchMockCurrentUser(token)
  }

  const payload = await ajaxQuery<LegacyUserInfoResponse>('@query:LoginApi__getLoginUserInfo/username:userName,realname:nickName,roles:roleInfos{value:roleId,roleName}', {
    accessToken: token
  }, {
    withAuth: false,
    headers: buildTokenHeaders(token)
  })

  return normalizeUser(payload)
}

export async function loginWithPassword(username: string, password: string): Promise<AuthSession> {
  if (isMockEnabled()) {
    return mockLoginWithPassword(username, password)
  }

  const loginResponse = await ajaxFetch<LoginApiResponse>('/r/LoginApi__login?@selection=token:accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    withAuth: false,
    data: {
      loginType: 1,
      principalId: username,
      principalSecret: password
    }
  })

  const token = loginResponse.token ?? loginResponse.accessToken

  if (!token) {
    throw new Error('Login response does not contain a token')
  }

  const user = loginResponse.userInfo ? normalizeUser(loginResponse.userInfo) : await fetchCurrentUser(token)

  return { user, token }
}

export async function logoutRequest(token?: string): Promise<void> {
  if (isMockEnabled()) {
    await mockLogoutRequest()
    return
  }

  if (!token) {
    return
  }

  await ajaxQuery<unknown>('@mutation:LoginApi__logout', {
    accessToken: token
  }, {
    withAuth: false,
    headers: buildTokenHeaders(token)
  })
}
