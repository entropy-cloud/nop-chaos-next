import { describe, expect, it } from 'vitest';
import { resolveNopRpcUrl } from './nopRpcResolver';

describe('resolveNopRpcUrl', () => {
  it('routes @query to /r/ with POST', () => {
    const result = resolveNopRpcUrl('@query:LoginApi__getInfo', null);
    expect(result).toMatchObject({ url: '/r/LoginApi__getInfo', method: 'POST' });
  });

  it('wraps @mutation data as {data: originalData}', () => {
    const result = resolveNopRpcUrl('@mutation:NopAuthUser__save', { name: 'abc' });
    expect(result?.data).toEqual({ data: { name: 'abc' } });
  });

  it('passes @query data through unwrapped', () => {
    const result = resolveNopRpcUrl('@query:LoginApi__getInfo', { path: '/x' });
    expect(result?.data).toEqual({ path: '/x' });
  });

  it('filters __/@/v_ prefixed fields from @mutation data', () => {
    const result = resolveNopRpcUrl('@mutation:NopAuthUser__save', {
      name: 'abc',
      __typename: 'NopAuthUser',
      '@version': 1,
      v_tracker: 'x',
    });
    expect(result?.data).toEqual({ data: { name: 'abc' } });
  });

  it('passes non-object @mutation data into {data} without filtering', () => {
    const result = resolveNopRpcUrl('@mutation:X__save', 'raw-string');
    expect(result?.data).toEqual({ data: 'raw-string' });
  });

  describe('selection source priority', () => {
    it('uses independent selection param when provided', () => {
      const result = resolveNopRpcUrl('@query:Demo__findPage', null, 'id,name');
      expect(result?.url).toBe('/r/Demo__findPage?%40selection=id%2Cname');
      expect(result?.selection).toBe('id,name');
    });

    it('falls back to URL path selection when no independent param', () => {
      const result = resolveNopRpcUrl('@query:Demo__findPage/id,name', null);
      expect(result?.url).toBe('/r/Demo__findPage?%40selection=id%2Cname');
      expect(result?.selection).toBe('id,name');
    });

    it('independent param takes priority over URL path', () => {
      const result = resolveNopRpcUrl('@query:Demo__findPage/fromUrl', null, 'fromParam');
      expect(result?.selection).toBe('fromParam');
    });

    it('empty-string independent selection falls back to URL path', () => {
      const result = resolveNopRpcUrl('@query:Demo__findPage/fromUrl', null, '');
      expect(result?.selection).toBe('fromUrl');
    });

    it('omits selection query when neither source provides one', () => {
      const result = resolveNopRpcUrl('@query:Demo__findPage', null);
      expect(result?.url).toBe('/r/Demo__findPage');
      expect(result?.selection).toBeUndefined();
    });
  });

  describe('selection escaping', () => {
    it('encodes both param name and value', () => {
      const result = resolveNopRpcUrl('@query:X', null, 'items{id,name}');
      expect(result?.url).toBe('/r/X?%40selection=items%7Bid%2Cname%7D');
    });

    it('encodes URL-path selection value too', () => {
      const result = resolveNopRpcUrl('@query:X/items{id,name}', null);
      expect(result?.url).toBe('/r/X?%40selection=items%7Bid%2Cname%7D');
    });
  });

  it('returns null for non-nop urls', () => {
    expect(resolveNopRpcUrl('/api/foo', null)).toBeNull();
    expect(resolveNopRpcUrl('https://example.com/x', null)).toBeNull();
  });

  it('preserves operationName for mutation selection', () => {
    const result = resolveNopRpcUrl('@mutation:NopAuthUser__save', { id: '1' }, 'id,name');
    expect(result?.operationName).toBe('NopAuthUser__save');
    expect(result?.url).toBe('/r/NopAuthUser__save?%40selection=id%2Cname');
  });
});
