import { describe, expect, it } from 'vitest';
import { SHARED_MODULE_NAMES } from './sharedModuleNames';

describe('SHARED_MODULE_NAMES', () => {
  it('contains unique bare specifiers only', () => {
    expect(new Set(SHARED_MODULE_NAMES).size).toBe(SHARED_MODULE_NAMES.length);

    for (const name of SHARED_MODULE_NAMES) {
      // Bare specifier: either a scoped package or a plain package name,
      // optionally with a subpath such as react/jsx-runtime.
      expect(name).toMatch(/^(@[a-z0-9-]+\/)?[a-z0-9-]+(\/[a-z0-9-]+)*$/);
    }
  });

  it('covers the core extension dependencies', () => {
    for (const name of ['react', '@nop-chaos/shared', '@nop-chaos/ui', '@nop-chaos/plugin-bridge']) {
      expect(SHARED_MODULE_NAMES).toContain(name);
    }
  });
});