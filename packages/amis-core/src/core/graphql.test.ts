import { describe, expect, it } from 'vitest';
import { normalizeGraphQLResponse, transformGraphQLRequest } from './graphql';

describe('transformGraphQLRequest', () => {
  it('converts query urls into graphql payloads', () => {
    const transformed = transformGraphQLRequest({
      url: '@query:PageProvider__getPage',
      data: {
        path: '/pages/demo.page.json',
      },
    });

    expect(transformed).toBeTruthy();
    expect(transformed?.request.url).toBe('/graphql');
    expect(transformed?.request.method).toBe('post');
    expect(transformed?.request.data).toMatchObject({
      variables: {
        path: '/pages/demo.page.json',
      },
    });
  });

  it('normalizes nop graphql payloads into amis shape', () => {
    expect(
      normalizeGraphQLResponse(
        {
          data: {
            PageProvider__getPage: {
              schema: true,
            },
          },
          extensions: {
            'nop-msg': 'ok',
          },
        },
        'PageProvider__getPage',
      ),
    ).toMatchObject({
      status: 0,
      msg: 'ok',
      data: {
        schema: true,
      },
    });
  });

  it('supports amis picker loadOptions for findPage', () => {
    const transformed = transformGraphQLRequest({
      url: '@query:DemoEntity__findPage',
      data: {
        op: 'loadOptions',
        value: '1,2',
        valueField: 'id',
        labelField: 'name',
      },
      valueField: 'id',
      labelField: 'name',
    });

    const payload = transformed?.request.data as {
      query: string;
      variables: { query: { filter?: { $body?: Array<{ name?: string }> } } };
    };

    expect(payload.query).toContain('items{id,name}');
    expect(payload.variables.query.filter?.$body?.[0]).toMatchObject({
      $type: 'in',
      name: 'id',
    });
  });

  it('reads legacy gql selection option names', () => {
    const transformed = transformGraphQLRequest({
      url: '@query:NopAuthDept__findList',
      data: {
        limit: 10,
      },
      'gql:selection': 'id,deptName,parentId',
    });

    const payload = transformed?.request.data as { query: string };

    expect(payload.query).toContain('NopAuthDept__findList(query:$query){');
    expect(payload.query).toContain('{\nid,deptName,parentId\n}');
  });

  it('packs top-level form fields into variables.data for save mutation', () => {
    const transformed = transformGraphQLRequest({
      url: '@mutation:NopAuthDept__save/id,deptName,parentId',
      data: {
        id: 'dept-1',
        deptName: 'Platform',
        parentId: 'root',
        __typename: 'NopAuthDept',
      },
    });

    expect(transformed?.request.url).toBe('/graphql');
    expect(transformed?.request.method).toBe('post');
    expect(transformed?.request.data).toMatchObject({
      variables: {
        data: {
          id: 'dept-1',
          deptName: 'Platform',
          parentId: 'root',
        },
      },
    });
  });
});

describe('normalizeGraphQLResponse error branches', () => {
  it('extracts status and msg from errors array', () => {
    const result = normalizeGraphQLResponse({
      data: null,
      errors: [{ message: 'Not found' }],
    }) as Record<string, unknown>;

    expect(result.status).toBe(-1);
    expect(result.msg).toBe('Not found');
  });

  it('uses nop-status from extensions when errors are present', () => {
    const result = normalizeGraphQLResponse({
      data: null,
      errors: [{ message: 'Forbidden' }],
      extensions: { 'nop-status': 403 },
    }) as Record<string, unknown>;

    expect(result.status).toBe(403);
    expect(result.msg).toBe('Forbidden');
  });

  it('falls back to generic message when error object lacks message', () => {
    const result = normalizeGraphQLResponse({
      data: null,
      errors: [{ code: 'INTERNAL' }],
    }) as Record<string, unknown>;

    expect(result.msg).toBe('GraphQL request failed');
  });

  it('falls back to generic message when error is a primitive', () => {
    const result = normalizeGraphQLResponse({
      data: null,
      errors: ['unexpected error'],
    }) as Record<string, unknown>;

    expect(result.msg).toBe('GraphQL request failed');
  });

  it('passes non-object data through unchanged', () => {
    expect(normalizeGraphQLResponse(null)).toBeNull();
    expect(normalizeGraphQLResponse('string')).toBe('string');
    expect(normalizeGraphQLResponse(42)).toBe(42);
  });

  it('extracts operation data when operationName matches', () => {
    const result = normalizeGraphQLResponse(
      {
        data: {
          PageProvider__getPage: { schema: true },
        },
        extensions: { 'nop-msg': 'ok' },
      },
      'PageProvider__getPage',
    ) as Record<string, unknown>;

    expect((result.data as Record<string, unknown>)).toEqual({ schema: true });
    expect(result.status).toBe(0);
    expect(result.msg).toBe('ok');
  });
});
