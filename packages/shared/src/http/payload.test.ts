import { describe, expect, it } from 'vitest';
import { isApiPayload, unwrapApiPayload } from './payload';

describe('isApiPayload', () => {
  it('returns true for objects with status, msg, or data', () => {
    expect(isApiPayload({ status: 0 })).toBe(true);
    expect(isApiPayload({ msg: 'ok' })).toBe(true);
    expect(isApiPayload({ data: { id: 1 } })).toBe(true);
  });

  it('returns false for null, non-objects, or empty objects', () => {
    expect(isApiPayload(null)).toBe(false);
    expect(isApiPayload('string')).toBe(false);
    expect(isApiPayload(42)).toBe(false);
    expect(isApiPayload({})).toBe(false);
  });
});

describe('unwrapApiPayload', () => {
  it('returns data when status is 0', () => {
    const result = unwrapApiPayload({ status: 0, data: { id: 1 } });
    expect(result).toEqual({ id: 1 });
  });

  it('throws with the msg field when status is non-zero', () => {
    expect(() => unwrapApiPayload({ status: 1, msg: 'Not found' })).toThrow('Not found');
  });

  it('throws with fallback message when status is non-zero and msg is missing', () => {
    expect(() => unwrapApiPayload({ status: -1 })).toThrow('Request failed');
  });

  it('throws with fallback message when msg is empty string', () => {
    expect(() => unwrapApiPayload({ status: 1, msg: '' })).toThrow('Request failed');
  });

  it('uses custom fallback message', () => {
    expect(() => unwrapApiPayload({ status: 500 }, 'Custom error')).toThrow('Custom error');
  });

  it('passes through non-payload values', () => {
    const value = { some: 'data' };
    expect(unwrapApiPayload(value)).toBe(value);
  });

  it('returns value as-is when object has no status field', () => {
    const value = { msg: 'info', data: [] };
    const result = unwrapApiPayload(value);
    expect(result).toBe(value);
  });

  it('returns value as-is when object has msg but no status', () => {
    const value = { msg: 'fail' };
    expect(unwrapApiPayload(value)).toBe(value);
  });
});
