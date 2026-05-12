import { describe, expect, it } from 'vitest';

function containsIgnoreCase(value: string, keyword: string) {
  return value.toLowerCase().includes(keyword.trim().toLowerCase());
}

describe('master-detail detail filter matching', () => {
  it('matches mixed-case keywords with trimming', () => {
    expect(containsIgnoreCase('SF Express TRACK-1001 Delivered', '  track-1001 ')).toBe(true);
    expect(containsIgnoreCase('Receiver Alice 1380000', 'alice')).toBe(true);
    expect(containsIgnoreCase('Product Alpha', 'beta')).toBe(false);
  });
});
