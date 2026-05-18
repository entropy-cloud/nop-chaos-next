import { describe, expect, it, vi } from 'vitest';

import { createDemoSession } from './demoSession';

describe('ExtensionLoginPage demo session contract', () => {
  it('creates a non-fixed demo token without requiring a password constant', () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '11111111-1111-4111-8111-111111111111',
    );

    const session = createDemoSession('captain');

    expect(session.user).toMatchObject({
      id: 'captain',
      username: 'captain',
      nickname: 'Harbor Captain',
      roles: ['admin'],
    });
    expect(session.token).toBe('extension-demo:captain:11111111-1111-4111-8111-111111111111');
    expect(session.tokens?.accessToken).toBe(session.token);
  });

  it('falls back to the default username when input is blank', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_717_000_000_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.5);

    const session = createDemoSession('   ');

    expect(session.user.username).toBe('harbor');
    expect(session.token?.startsWith('extension-demo:harbor:')).toBe(true);
  });
});
