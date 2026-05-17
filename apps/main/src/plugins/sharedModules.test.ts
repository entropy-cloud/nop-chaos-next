// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  registerHostSharedModules,
  registerBaseSharedModules,
  ensurePluginSharedModules,
} from './sharedModules';

describe('sharedModules', () => {
  it('registerHostSharedModules populates __NOP_SHARED__', () => {
    delete globalThis.__NOP_SHARED__;
    registerHostSharedModules();

    expect(globalThis.__NOP_SHARED__).toBeDefined();
    expect(globalThis.__NOP_SHARED__!.react).toBeDefined();
    expect(globalThis.__NOP_SHARED__!['@nop-chaos/shared']).toBeDefined();
    expect(globalThis.__NOP_SHARED__!.zustand).toBeDefined();
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
});
