import { describe, expect, it } from 'vitest';
import {
  HOST_API_VERSION,
  compareApiVersions,
  isApiVersion,
  satisfiesMinApiVersion,
} from './version';

describe('HOST_API_VERSION', () => {
  it('is a valid x.y.z version', () => {
    expect(isApiVersion(HOST_API_VERSION)).toBe(true);
  });
});

describe('isApiVersion', () => {
  it('accepts x.y.z only', () => {
    expect(isApiVersion('0.1.0')).toBe(true);
    expect(isApiVersion('1.2.3')).toBe(true);
    expect(isApiVersion('10.0.0')).toBe(true);
    expect(isApiVersion('1.2')).toBe(false);
    expect(isApiVersion('1.2.3.4')).toBe(false);
    expect(isApiVersion('v1.2.3')).toBe(false);
    expect(isApiVersion('1.2.x')).toBe(false);
    expect(isApiVersion('')).toBe(false);
  });
});

describe('compareApiVersions', () => {
  it('orders versions numerically per segment', () => {
    expect(compareApiVersions('0.1.0', '0.1.0')).toBe(0);
    expect(compareApiVersions('0.1.0', '0.2.0')).toBeLessThan(0);
    expect(compareApiVersions('0.2.0', '0.1.0')).toBeGreaterThan(0);
    expect(compareApiVersions('0.9.9', '0.10.0')).toBeLessThan(0);
    expect(compareApiVersions('1.0.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareApiVersions('1.2.3', '1.2.3')).toBe(0);
  });
});

describe('satisfiesMinApiVersion', () => {
  it('accepts equal or newer hosts', () => {
    expect(satisfiesMinApiVersion('0.1.0', '0.1.0')).toBe(true);
    expect(satisfiesMinApiVersion('0.2.0', '0.1.0')).toBe(true);
    expect(satisfiesMinApiVersion('1.0.0', '0.1.0')).toBe(true);
  });

  it('rejects older hosts', () => {
    expect(satisfiesMinApiVersion('0.1.0', '0.2.0')).toBe(false);
    expect(satisfiesMinApiVersion('0.1.0', '1.0.0')).toBe(false);
  });
});