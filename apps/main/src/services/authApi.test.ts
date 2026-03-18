import { beforeEach, describe, expect, it, vi } from 'vitest'

const ajaxFetch = vi.fn()
const ajaxQuery = vi.fn()

vi.mock('./http', () => ({
  ajaxFetch,
  ajaxQuery
}))

describe('authApi', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
    ajaxFetch.mockReset()
    ajaxQuery.mockReset()
  })

  it('uses mock auth flow without backend HTTP when enabled', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'true')

    const { fetchCurrentUser, loginWithPassword, logoutRequest } = await import('./authApi')
    const session = await loginWithPassword('nop', '123')

    expect(session.token).toBe('mock-token:nop')
    expect(session.user.username).toBe('nop')
    expect(ajaxFetch).not.toHaveBeenCalled()

    const user = await fetchCurrentUser('legacy-real-token')

    expect(user.username).toBe('nop')
    expect(ajaxQuery).not.toHaveBeenCalled()

    await logoutRequest('legacy-real-token')

    expect(ajaxQuery).not.toHaveBeenCalled()
  })

  it('delegates login to backend HTTP when mock mode is disabled', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'false')
    ajaxFetch.mockResolvedValue({
      token: 'real-token',
      userInfo: {
        username: 'alice',
        nickname: 'Alice',
        roles: [{ value: 'admin' }]
      }
    })

    const { loginWithPassword } = await import('./authApi')
    const session = await loginWithPassword('alice', 'secret')

    expect(ajaxFetch).toHaveBeenCalledOnce()
    expect(session).toEqual({
      token: 'real-token',
      user: {
        id: 'alice',
        username: 'alice',
        nickname: 'Alice',
        avatar: undefined,
        email: undefined,
        roles: ['admin']
      }
    })
  })
})
