import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/env', () => ({
  isMockEnabled: () => true,
}));

vi.mock('../../utils/storage', () => ({
  getStorageItem: vi.fn(() => null),
  setStorageItem: vi.fn(),
}));

describe('mockApi/shared', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('clone returns a deep copy', async () => {
    const { clone } = await import('./shared');
    const obj = { a: [1, 2], b: { c: 3 } };
    const cloned = clone(obj);
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.a).not.toBe(obj.a);
  });

  it('wait resolves with the value', async () => {
    const { wait } = await import('./shared');
    const result = await wait('hello', 0);
    expect(result).toBe('hello');
  });

  it('readStoredJson returns clone of fallback when no stored data', async () => {
    const { readStoredJson } = await import('./shared');
    const fallback = [{ id: 1 }];
    const result = readStoredJson('test-key', fallback);
    expect(result).toEqual(fallback);
    expect(result).not.toBe(fallback);
  });

  it('readStoredJson parses stored JSON', async () => {
    const { getStorageItem } = await import('../../utils/storage');
    vi.mocked(getStorageItem).mockReturnValueOnce('[{"id":42}]');
    const { readStoredJson } = await import('./shared');
    const result = readStoredJson('key', []);
    expect(result).toEqual([{ id: 42 }]);
  });

  it('readStoredJson returns fallback on invalid JSON', async () => {
    const { getStorageItem } = await import('../../utils/storage');
    vi.mocked(getStorageItem).mockReturnValueOnce('not-json');
    const { readStoredJson } = await import('./shared');
    const fallback = [{ id: 'default' }];
    const result = readStoredJson('key', fallback);
    expect(result).toEqual(fallback);
  });

  it('writeStoredJson writes stringified value', async () => {
    const { setStorageItem } = await import('../../utils/storage');
    const { writeStoredJson } = await import('./shared');
    writeStoredJson('key', { a: 1 });
    expect(setStorageItem).toHaveBeenCalled();
    expect(vi.mocked(setStorageItem).mock.calls[0][1]).toBe('{"a":1}');
  });

  it('writeStoredJson handles storage error gracefully', async () => {
    const { setStorageItem } = await import('../../utils/storage');
    vi.mocked(setStorageItem).mockImplementation(() => {
      throw new Error('storage full');
    });
    const { writeStoredJson } = await import('./shared');
    expect(() => writeStoredJson('key', { a: 1 })).not.toThrow();
  });

  it('readStoredJson handles storage read error gracefully', async () => {
    const { getStorageItem } = await import('../../utils/storage');
    vi.mocked(getStorageItem).mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    const { readStoredJson } = await import('./shared');
    const result = readStoredJson('key', [{ id: 'fallback' }]);
    expect(result).toEqual([{ id: 'fallback' }]);
  });
});
