import { describe, expect, it } from 'vitest';
import { HOST_API_VERSION, SHARED_MODULE_NAMES } from '@nop-chaos/shared';
import {
  EXTENSION_SOURCES_GLOBAL,
  HOST_API_VERSION_GLOBAL,
  HOST_API_VERSION as TOOL_HOST_API_VERSION,
  SHARED_MODULE_NAMES as TOOL_SHARED_MODULE_NAMES,
} from './contract.mjs';

describe('contract mirror parity', () => {
  it('mirrors HOST_API_VERSION from @nop-chaos/shared', () => {
    expect(TOOL_HOST_API_VERSION).toBe(HOST_API_VERSION);
  });

  it('mirrors SHARED_MODULE_NAMES from @nop-chaos/shared', () => {
    expect([...TOOL_SHARED_MODULE_NAMES].sort()).toEqual([...SHARED_MODULE_NAMES].sort());
    expect(TOOL_SHARED_MODULE_NAMES.length).toBeGreaterThan(0);
  });

  it('keeps the runtime globals stable', () => {
    expect(EXTENSION_SOURCES_GLOBAL).toBe('__NOP_EXTENSIONS__');
    expect(HOST_API_VERSION_GLOBAL).toBe('__NOP_HOST_API_VERSION__');
  });
});