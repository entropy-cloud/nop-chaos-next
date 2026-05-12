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
});
