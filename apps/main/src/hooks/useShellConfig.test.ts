import { describe, expect, it, vi } from 'vitest';

vi.mock('@nop-chaos/extension-host', () => ({
  getShellRuntimeConfig: () => ({
    branding: { name: 'Test', shortName: 'T' },
    loginUi: { features: [] },
    systemPages: {},
  }),
}));

describe('useShellConfig', () => {
  it('returns shell runtime config', async () => {
    const { useShellConfig } = await import('./useShellConfig');
    const config = useShellConfig();
    expect(config.branding.name).toBe('Test');
  });
});
