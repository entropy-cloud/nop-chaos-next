import type { AuthSession, User } from '@nop-chaos/shared';

function createDemoAccessToken(username: string): string {
  const trimmedUsername = username.trim() || 'harbor';
  const suffix =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  return `extension-demo:${trimmedUsername}:${suffix}`;
}

export function createDemoSession(username: string): AuthSession {
  const trimmedUsername = username.trim() || 'harbor';
  const accessToken = createDemoAccessToken(trimmedUsername);
  const user: User = {
    id: trimmedUsername,
    username: trimmedUsername,
    nickname: 'Harbor Captain',
    roles: ['admin'],
  };

  return {
    user,
    token: accessToken,
    tokens: {
      accessToken,
    },
  };
}
