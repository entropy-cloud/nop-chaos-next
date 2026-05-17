import { describe, expect, it, vi } from 'vitest';

vi.mock('./shared', () => ({
  wait: (value: unknown) => Promise.resolve(value),
}));

describe('mockApi/auth', () => {
  it('fetchMockCurrentUser returns default user for no token', async () => {
    const { fetchMockCurrentUser } = await import('./auth');
    const user = await fetchMockCurrentUser();
    expect(user.username).toBe('nop');
    expect(user.nickname).toBe('NOP Mock User');
  });

  it('fetchMockCurrentUser extracts username from mock token', async () => {
    const { fetchMockCurrentUser } = await import('./auth');
    const user = await fetchMockCurrentUser('mock-token:alice');
    expect(user.username).toBe('alice');
    expect(user.nickname).toBe('alice Mock User');
  });

  it('fetchMockCurrentUser falls back for non-mock token', async () => {
    const { fetchMockCurrentUser } = await import('./auth');
    const user = await fetchMockCurrentUser('some-other-token');
    expect(user.username).toBe('nop');
  });

  it('fetchMockCurrentUser returns default for empty encoded username', async () => {
    const { fetchMockCurrentUser } = await import('./auth');
    const user = await fetchMockCurrentUser('mock-token:');
    expect(user.username).toBe('nop');
  });

  it('mockLoginWithPassword returns session for valid credentials', async () => {
    const { mockLoginWithPassword } = await import('./auth');
    const session = await mockLoginWithPassword('alice', 'secret');
    expect(session.token).toBe('mock-token:alice');
    expect(session.user.username).toBe('alice');
    expect(session.tokens?.refreshToken).toContain('mock-refresh-token:');
    expect(session.tokens?.expiresAt).toBeGreaterThan(Date.now() - 1000);
  });

  it('mockLoginWithPassword uses default username for empty input', async () => {
    const { mockLoginWithPassword } = await import('./auth');
    const session = await mockLoginWithPassword('  ', 'password');
    expect(session.user.username).toBe('nop');
    expect(session.token).toBe('mock-token:nop');
  });

  it('mockLoginWithPassword throws for empty password', async () => {
    const { mockLoginWithPassword } = await import('./auth');
    await expect(mockLoginWithPassword('user', '  ')).rejects.toThrow(
      'Password is required in mock mode',
    );
  });

  it('mockRefreshAccessToken returns new token for valid refresh token', async () => {
    const { mockRefreshAccessToken } = await import('./auth');
    const result = await mockRefreshAccessToken('mock-refresh-token:bob');
    expect(result.accessToken).toBe('mock-token:bob');
    expect(result.expiresIn).toBe(300);
    expect(result.refreshToken).toBe('mock-refresh-token:bob');
  });

  it('mockRefreshAccessToken defaults username for non-mock refresh token', async () => {
    const { mockRefreshAccessToken } = await import('./auth');
    const result = await mockRefreshAccessToken('some-other-refresh-token');
    expect(result.accessToken).toBe('mock-token:nop');
  });

  it('mockLogoutRequest resolves without error', async () => {
    const { mockLogoutRequest } = await import('./auth');
    await expect(mockLogoutRequest()).resolves.toBeUndefined();
  });
});
