// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  registerHostSharedModules,
  registerBaseSharedModules,
  ensurePluginSharedModules,
  resetSharedModulesForTests,
  setPluginExtraModulesLoaderForTests,
} from './sharedModules';

describe('sharedModules', () => {
  beforeEach(() => {
    resetSharedModulesForTests();
  });

  it('registerHostSharedModules populates __NOP_SHARED__', () => {
    delete globalThis.__NOP_SHARED__;
    registerHostSharedModules();

    expect(globalThis.__NOP_SHARED__).toBeDefined();
    expect(globalThis.__NOP_SHARED__!.react).toBeDefined();
    expect(globalThis.__NOP_SHARED__!['@nop-chaos/shared']).toBeDefined();
    expect(globalThis.__NOP_SHARED__!.zustand).toBeDefined();
    expect(globalThis.__NOP_SHARED__!['@nop-chaos/shared']).not.toHaveProperty('setRefreshTokenFetcher');
  });

  it('registerHostSharedModules merges with existing entries', () => {
    globalThis.__NOP_SHARED__ = { existing: true };
    registerHostSharedModules();

    expect((globalThis.__NOP_SHARED__ as Record<string, unknown>).existing).toBe(true);
    expect(globalThis.__NOP_SHARED__!.react).toBeDefined();
  });

  it('registerBaseSharedModules is idempotent', () => {
    registerBaseSharedModules();
    registerBaseSharedModules();

    expect(globalThis.__NOP_SHARED__).toBeDefined();
  });

  it('ensurePluginSharedModules registers recharts', async () => {
    await ensurePluginSharedModules();

    expect(globalThis.__NOP_SHARED__!.recharts).toBeDefined();
  }, 30000);

  it('ensurePluginSharedModules is idempotent', async () => {
    await ensurePluginSharedModules();
    await ensurePluginSharedModules();

    expect(globalThis.__NOP_SHARED__!.recharts).toBeDefined();
  }, 30000);

  it('deduplicates concurrent plugin extra module loads', async () => {
    const loader = vi.fn(async () => ({ marker: 'recharts' } as never));
    setPluginExtraModulesLoaderForTests(loader);

    await Promise.all([ensurePluginSharedModules(), ensurePluginSharedModules(), ensurePluginSharedModules()]);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(globalThis.__NOP_SHARED__!.recharts).toEqual({ marker: 'recharts' });
  });

  it('retries after a failed extra module load', async () => {
    const loader = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ marker: 'retry-success' });
    setPluginExtraModulesLoaderForTests(loader as () => Promise<typeof import('recharts')>);

    await expect(ensurePluginSharedModules()).rejects.toThrow('boom');
    await expect(ensurePluginSharedModules()).resolves.toBeUndefined();

    expect(loader).toHaveBeenCalledTimes(2);
    expect(globalThis.__NOP_SHARED__!.recharts).toEqual({ marker: 'retry-success' });
  });
});
