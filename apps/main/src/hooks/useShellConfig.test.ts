import { describe, expect, it, vi } from 'vitest';

vi.mock('@nop-chaos/extension-host', () => ({
  subscribeShellRuntimeConfig: vi.fn(() => () => undefined),
  getShellRuntimeConfig: () => ({
    branding: { name: 'Test', shortName: 'T' },
    loginUi: { features: [] },
    systemPages: {},
  }),
}));

vi.mock('react', () => ({
  useSyncExternalStore: vi.fn(
    (
      subscribe: (listener: () => void) => () => void,
      getSnapshot: () => unknown,
      _getServerSnapshot: () => unknown,
    ) => {
      subscribe(() => undefined);
      return getSnapshot();
    },
  ),
}));

describe('useShellConfig', () => {
  it('returns shell runtime config', async () => {
    const { useShellConfig } = await import('./useShellConfig');
    const config = useShellConfig();
    expect(config.branding.name).toBe('Test');
  });
});
