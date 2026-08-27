import type { NopRpcResolution } from './nopRpcResolver';
import { resolveNopRpcUrl } from './nopRpcResolver';

function result(url: string, data?: unknown, selection?: string): NopRpcResolution {
  const res = resolveNopRpcUrl(url, data ?? null, selection);
  if (!res) throw new Error(`resolveNopRpcUrl returned null for: ${url}`);
  return res;
}

function r(url: string, data?: unknown, selection?: string): NopRpcResolution | null {
  return resolveNopRpcUrl(url, data ?? null, selection);
}

import { describe, expect, it } from 'vitest';

describe('route: @query', () => {
  it('routes to /r/ with POST', () => {
    expect(r('@query:LoginApi__getInfo')).toMatchObject({ url: '/r/LoginApi__getInfo', method: 'POST' });
  });
  it('passes through unknown operations', () => {
    const res = result('@query:LoginApi__getInfo', { path: '/x' });
    expect(res.data).toEqual({ path: '/x' });
  });
});

describe('route: /r/', () => {
  it('routes as-is', () => {
    const res = result('/r/NopAuthUser__findPage?page=2&perPage=20');
    expect(res).toMatchObject({ url: '/r/NopAuthUser__findPage', method: 'POST' });
  });
  it('filters __ fields recursively', () => {
    const res = result('/r/NopAuthUser__findPage', {
      query: { filter: { userName: 'test' }, __internal: 'x' },
      __autoPagination: { page: 1, perPage: 10 },
      '@version': 2,
    });
    expect(res.data).toEqual({ query: { filter: { userName: 'test' } } });
  });
  it('filters $ prefixed runtime state fields (e.g. $form)', () => {
    const res = result('/r/NopAuthResource__save', {
      siteId: 'main',
      resourceId: 'e2e_res_1',
      $form: { id: 'add', name: 'add', submitting: true, valid: true },
      $scope: { dirty: false },
    });
    expect(res.data).toEqual({ siteId: 'main', resourceId: 'e2e_res_1' });
  });
  it('passes through non-special fields', () => {
    const res = result('/r/NopAuthResource__findList', {
      filter_displayName__contains: 'test',
    });
    expect(res.data).toEqual({ filter_displayName__contains: 'test' });
  });
  it('works with no data', () => {
    expect(r('/r/NopAuthUser__findPage')).toMatchObject({ url: '/r/NopAuthUser__findPage' });
  });
});

describe('@query findPage', () => {
  it('page=2&perPage=20 → offset=20 limit=20', () => {
    const res = result('@query:NopAuthUser__findPage?page=2&perPage=20');
    expect(res.data).toMatchObject({ query: { offset: 20, limit: 20 } });
  });
  it('converts filter_XX to TreeBean', () => {
    const res = result('@query:NopAuthUser__findPage', {
      filter_userName__contains: 'john',
      filter_status: '1',
    });
    expect(res.data).toMatchObject({
      query: { filter: { $body: [{ $type: 'contains', name: 'userName', value: 'john' }, { $type: 'eq', name: 'status', value: '1' }] } },
    });
  });
  it('converts filter_XX nested inside query (flux shape) to TreeBean and removes residual keys', () => {
    const res = result('@query:NopAuthUser__findPage', {
      query: {
        filter_status__eq: '1',
        filter_userName__contains: 'john',
        filter_createdAt__between: '2026-01-01,2026-02-01',
        limit: 10,
      },
      pagination: { currentPage: 1, pageSize: 10 },
      sort: { column: 'userName', direction: 'asc' },
      filters: {},
      selection: [],
    });
    expect(res.data).toMatchObject({
      query: {
        limit: 10,
        filter: {
          $body: [
            { $type: 'eq', name: 'status', value: '1' },
            { $type: 'contains', name: 'userName', value: 'john' },
            { $type: 'between', name: 'createdAt', min: '2026-01-01', max: '2026-02-01' },
          ],
        },
      },
    });
    const query = (res.data as { query: Record<string, unknown> }).query;
    expect(Object.keys(query)).not.toContain('filter_status__eq');
    expect(Object.keys(query)).not.toContain('filter_userName__contains');
    expect(Object.keys(query)).not.toContain('filter_createdAt__between');
    expect(Object.keys(query)).toContain('filter');
  });
  it('merges nested query filter_XX with existing query.filter', () => {
    const res = result('@query:NopAuthUser__findPage', {
      query: {
        filter: { $type: 'and', $body: [{ $type: 'eq', name: 'deptId', value: 10 }] },
        filter_status__eq: '1',
      },
    });
    expect(res.data).toMatchObject({
      query: {
        filter: {
          $body: [
            { $type: 'and', $body: [{ $type: 'eq', name: 'deptId', value: 10 }] },
            { $type: 'and', $body: [{ $type: 'eq', name: 'status', value: '1' }] },
          ],
        },
      },
    });
    const query = (res.data as { query: Record<string, unknown> }).query;
    expect(Object.keys(query)).not.toContain('filter_status__eq');
  });
  it('merges existing query.filter with filter_XX', () => {
    const res = result('@query:NopAuthUser__findPage', {
      query: { filter: { $type: 'and', $body: [{ $type: 'eq', name: 'status', value: 1 }] } },
      filter_userName__contains: 'test',
    });
    expect(res.data).toMatchObject({
      query: { filter: { $body: [
        { $type: 'and', $body: [{ $type: 'eq', name: 'status', value: 1 }] },
        { $type: 'and', $body: [{ $type: 'contains', name: 'userName', value: 'test' }] },
      ] } },
    });
  });
  it('converts orderField/orderDir to orderBy', () => {
    const res = result('@query:NopAuthUser__findPage', { orderField: 'userName', orderDir: 'desc' });
    expect(res.data).toMatchObject({ query: { orderBy: [{ name: 'userName', desc: true }] } });
  });
  it('handles page from URL params and data merging', () => {
    // 模拟 nopRpcRequest 合并 params 后的情景：
    // 1. URL query params: page=1&perPage=10 (from __autoPagination in buildUrlWithParams)
    // 2. api.params = { page: 1, perPage: 10 } (已合并到 data)
    // 3. api.data = { query: { filter: {...} } }
    const data = {
      query: { filter: { userName: 'test' } },
      page: 1,
      perPage: 10,
    };
    const res = result('@query:NopAuthUser__findPage?page=1&perPage=10', data);
    expect(res.data).toMatchObject({ query: { offset: 0, limit: 10, filter: { $body: [{ $type: 'eq', name: 'userName', value: 'test' }] } } });
  });
});

describe('@query findList (same argQuery builder)', () => {
  it('applies same transformation as findPage', () => {
    const res = result('@query:NopAuthResource__findList', { filter_displayName__contains: 'test' });
    expect(res.data).toMatchObject({
      query: { filter: { $body: [{ $type: 'contains', name: 'displayName', value: 'test' }] } },
    });
  });
});

describe('@query get', () => {
  it('extracts id from URL query', () => {
    const res = result('@query:NopAuthRole__get?id=test-role');
    expect(res.data).toMatchObject({ id: 'test-role' });
  });
  it('extracts id from data body', () => {
    const res = result('@query:NopAuthRole__get', { id: 'test-role' });
    expect(res.data).toMatchObject({ id: 'test-role' });
  });
});

describe('@mutation save', () => {
  it('wraps as {data: {fields}}', () => {
    const res = result('@mutation:NopAuthUser__save', { userName: 'test', status: 1 });
    expect(res.data).toEqual({ data: { userName: 'test', status: 1 } });
  });
  it('filters __/@/v_ fields', () => {
    const res = result('@mutation:NopAuthUser__save', {
      userName: 'test', __autoPagination: { page: 1 }, '@v': 2, v_t: 'x',
    });
    expect(res.data).toEqual({ data: { userName: 'test' } });
  });
  it('wraps unregistered operations', () => {
    const res = result('@mutation:CustomOp__doSomething', { key: 'val' });
    expect(res.data).toEqual({ data: { key: 'val' } });
  });
});

describe('@mutation delete', () => {
  it('extracts id', () => {
    const res = result('@mutation:NopAuthRole__delete', { id: 'role-1' });
    expect(res.data).toMatchObject({ id: 'role-1' });
  });
});

describe('selection', () => {
  it('explicit param wins', () => {
    const res = result('@query:Demo__findPage', null, 'id,name');
    expect(res.url).toBe('/r/Demo__findPage?%40selection=id%2Cname');
    expect(res.selection).toBe('id,name');
  });
  it('URL path fallback', () => {
    const res = result('@query:Demo__findPage/id,name');
    expect(res.url).toBe('/r/Demo__findPage?%40selection=id%2Cname');
    expect(res.selection).toBe('id,name');
  });
  it('omitted when not provided', () => {
    const res = result('@query:Demo__findPage');
    expect(res.url).toBe('/r/Demo__findPage');
    expect(res.selection).toBeUndefined();
  });
  it('encodes properly', () => {
    const res = result('@query:X', null, 'items{id,name}');
    expect(res.url).toBe('/r/X?%40selection=items%7Bid%2Cname%7D');
  });
});

describe('edge', () => {
  it('returns null for non-nop urls', () => {
    expect(r('/api/foo')).toBeNull();
    expect(r('https://example.com/x')).toBeNull();
  });
  it('preserves operationName', () => {
    const res = result('@mutation:NopAuthUser__save', { id: '1' }, 'id,name');
    expect(res.operationName).toBe('NopAuthUser__save');
  });
  it('empty data works', () => {
    const res = result('@query:NopAuthUser__findPage', {});
    expect(res.data).toMatchObject({ query: { offset: 0, limit: 0 } });
  });
});
