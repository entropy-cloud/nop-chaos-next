import { describe, expect, it } from 'vitest';
import type { AmisRequestOptions } from '../types';
import type { ArgumentDefinition } from './graphqlArgs';
import {
  buildGraphQLQuery,
  buildGraphQLVariables,
  defaultArgBuilders,
  getOperationName,
  guessDefinition,
  guessExtArgDefinitions,
  normalizePickerLoadOptions,
  operationRegistry,
} from './graphqlArgs';

const opts: AmisRequestOptions = { url: '' };

describe('defaultArgBuilders', () => {
  describe('argBoolean', () => {
    it('returns null for missing value', () => {
      expect(defaultArgBuilders.Boolean!({}, { name: 'flag', type: 'Boolean' }, opts)).toBeNull();
    });

    it('returns null for null value', () => {
      expect(
        defaultArgBuilders.Boolean!({ flag: null }, { name: 'flag', type: 'Boolean' }, opts),
      ).toBeNull();
    });

    it('returns false for "false" string', () => {
      expect(
        defaultArgBuilders.Boolean!({ flag: 'false' }, { name: 'flag', type: 'Boolean' }, opts),
      ).toBe(false);
    });

    it('returns false for "n" string', () => {
      expect(defaultArgBuilders.Boolean!({ flag: 'n' }, { name: 'flag', type: 'Boolean' }, opts)).toBe(
        false,
      );
    });

    it('returns false for "0" string', () => {
      expect(defaultArgBuilders.Boolean!({ flag: '0' }, { name: 'flag', type: 'Boolean' }, opts)).toBe(
        false,
      );
    });

    it('returns false for "N" string', () => {
      expect(defaultArgBuilders.Boolean!({ flag: 'N' }, { name: 'flag', type: 'Boolean' }, opts)).toBe(
        false,
      );
    });

    it('returns true for truthy value', () => {
      expect(defaultArgBuilders.Boolean!({ flag: 'yes' }, { name: 'flag', type: 'Boolean' }, opts)).toBe(
        true,
      );
    });

    it('returns true for boolean true', () => {
      expect(defaultArgBuilders.Boolean!({ flag: true }, { name: 'flag', type: 'Boolean' }, opts)).toBe(
        true,
      );
    });
  });

  describe('argInt', () => {
    it('returns null for missing value', () => {
      expect(defaultArgBuilders.Int!({}, { name: 'count', type: 'Int' }, opts)).toBeNull();
    });

    it('parses integer from string', () => {
      expect(
        defaultArgBuilders.Int!({ count: '42' }, { name: 'count', type: 'Int' }, opts),
      ).toBe(42);
    });

    it('parses integer from number', () => {
      expect(defaultArgBuilders.Int!({ count: 42 }, { name: 'count', type: 'Int' }, opts)).toBe(42);
    });

    it('truncates float to integer', () => {
      expect(defaultArgBuilders.Int!({ count: 3.7 }, { name: 'count', type: 'Int' }, opts)).toBe(3);
    });
  });

  describe('argFloat', () => {
    it('returns null for missing value', () => {
      expect(defaultArgBuilders.Float!({}, { name: 'price', type: 'Float' }, opts)).toBeNull();
    });

    it('parses float from string', () => {
      expect(
        defaultArgBuilders.Float!({ price: '3.14' }, { name: 'price', type: 'Float' }, opts),
      ).toBeCloseTo(3.14);
    });

    it('parses float from number', () => {
      expect(defaultArgBuilders.Float!({ price: 3.14 }, { name: 'price', type: 'Float' }, opts)).toBe(
        3.14,
      );
    });
  });

  describe('argString', () => {
    it('returns null for missing value', () => {
      expect(defaultArgBuilders.String!({}, { name: 'name', type: 'String' }, opts)).toBeNull();
    });

    it('converts value to string', () => {
      expect(
        defaultArgBuilders.String!({ name: 42 }, { name: 'name', type: 'String' }, opts),
      ).toBe('42');
    });
  });

  describe('argMap', () => {
    it('returns raw value', () => {
      const data = { obj: { key: 'val' } };
      expect(defaultArgBuilders.Map!(data, { name: 'obj', type: 'Map' }, opts)).toEqual({ key: 'val' });
    });

    it('wraps non-data-root fields into data for save-style operations', () => {
      const data = {
        id: 'dept-1',
        deptName: 'Platform',
        parentId: 'root',
        __super: { ignored: true },
        '@tmp': 'ignored',
        v_trace: 'ignored',
      };

      expect(defaultArgBuilders.Map!(data, { name: 'data', type: 'Map' }, opts)).toEqual({
        id: 'dept-1',
        deptName: 'Platform',
        parentId: 'root',
      });
    });
  });

  describe('argStringList', () => {
    it('returns null for missing value', () => {
      expect(
        defaultArgBuilders['[String]']!({}, { name: 'ids', type: '[String]' }, opts),
      ).toBeNull();
    });

    it('splits string by comma', () => {
      expect(
        defaultArgBuilders['[String]']!({ ids: 'a,b,c' }, { name: 'ids', type: '[String]' }, opts),
      ).toEqual(['a', 'b', 'c']);
    });

    it('returns array value as-is', () => {
      expect(
        defaultArgBuilders['[String]']!({ ids: ['a', 'b'] }, { name: 'ids', type: '[String]' }, opts),
      ).toEqual(['a', 'b']);
    });
  });

  describe('argMapList', () => {
    it('returns raw value', () => {
      const items = [{ a: 1 }];
      expect(
        defaultArgBuilders['[Map]']!({ items }, { name: 'items', type: '[Map]' }, opts),
      ).toEqual(items);
    });
  });

  describe('argQuery', () => {
    it('builds query with limit and offset', () => {
      const result = defaultArgBuilders.QueryBeanInput!(
        { limit: 10, page: 2 },
        { name: 'query', type: 'QueryBeanInput' },
        opts,
      );
      expect(result).toMatchObject({ limit: 10, offset: 10 });
    });

    it('uses pageSize as fallback for limit', () => {
      const result = defaultArgBuilders.QueryBeanInput!(
        { pageSize: 20, page: 3 },
        { name: 'query', type: 'QueryBeanInput' },
        opts,
      );
      expect(result).toMatchObject({ limit: 20, offset: 40 });
    });

    it('uses perPage as fallback for limit', () => {
      const result = defaultArgBuilders.QueryBeanInput!(
        { perPage: 5, page: 1 },
        { name: 'query', type: 'QueryBeanInput' },
        opts,
      );
      expect(result).toMatchObject({ limit: 5, offset: 0 });
    });

    it('defaults limit and offset to 0', () => {
      const result = defaultArgBuilders.QueryBeanInput!(
        {},
        { name: 'query', type: 'QueryBeanInput' },
        opts,
      );
      expect(result).toMatchObject({ limit: 0, offset: 0 });
    });

    it('passes through cursor and timeout', () => {
      const result = defaultArgBuilders.QueryBeanInput!(
        { cursor: 'abc', timeout: 5000 },
        { name: 'query', type: 'QueryBeanInput' },
        opts,
      );
      expect(result).toMatchObject({ cursor: 'abc', timeout: 5000 });
    });

    it('prefers data.query values over top-level data', () => {
      const result = defaultArgBuilders.QueryBeanInput!(
        { query: { limit: 50, offset: 100 }, limit: 10, offset: 0 },
        { name: 'query', type: 'QueryBeanInput' },
        opts,
      );
      expect(result).toMatchObject({ limit: 50, offset: 100 });
    });

    it('applies orderBy with desc order', () => {
      const result = defaultArgBuilders.QueryBeanInput!(
        { orderBy: 'name', orderDir: 'desc' },
        { name: 'query', type: 'QueryBeanInput' },
        opts,
      );
      expect(result).toMatchObject({ orderBy: [{ name: 'name', desc: true }] });
    });
  });
});

describe('normalizePickerLoadOptions', () => {
  it('returns raw data for non-findPage operation', () => {
    const result = normalizePickerLoadOptions({ id: '1' }, opts, 'get');
    expect(result).toEqual({ data: { id: '1' }, selection: undefined });
  });

  it('returns raw data for findPage without loadOptions op', () => {
    const result = normalizePickerLoadOptions({ id: '1' }, opts, 'findPage');
    expect(result).toEqual({ data: { id: '1' }, selection: undefined });
  });

  it('transforms loadOptions for findPage with string value', () => {
    const result = normalizePickerLoadOptions(
      { op: 'loadOptions', value: '1,2' },
      { url: '', valueField: 'id', labelField: 'name' },
      'findPage',
    );
    expect(result.data).toEqual({ 'filter_id__in': ['1', '2'] });
    expect(result.selection).toBe('items{id,name}');
  });

  it('transforms loadOptions for findPage with array value', () => {
    const result = normalizePickerLoadOptions(
      { op: 'loadOptions', value: ['a', 'b'] },
      { url: '', valueField: 'code' },
      'findPage',
    );
    expect(result.data).toEqual({ 'filter_code__in': ['a', 'b'] });
    expect(result.selection).toBe('items{code,id}');
  });

  it('defaults valueField to id and labelField to id', () => {
    const result = normalizePickerLoadOptions(
      { op: 'loadOptions', value: 'x' },
      opts,
      'findPage',
    );
    expect(result.data).toEqual({ 'filter_id__in': ['x'] });
    expect(result.selection).toBe('items{id,id}');
  });

  it('uses custom delimiter', () => {
    const result = normalizePickerLoadOptions(
      { op: 'loadOptions', value: 'a|b' },
      { url: '', valueField: 'id', labelField: 'name', delimiter: '|' },
      'findPage',
    );
    expect(result.data).toEqual({ 'filter_id__in': ['a', 'b'] });
  });
});

describe('guessDefinition', () => {
  it('skips special __ prefixed keys', () => {
    const result = guessDefinition({ __typename: 'Query', name: 'test' });
    expect(result.arguments).toEqual([{ name: 'name', type: 'String' }]);
  });

  it('skips @ prefixed keys', () => {
    const result = guessDefinition({ '@skip': true, name: 'test' });
    expect(result.arguments).toEqual([{ name: 'name', type: 'String' }]);
  });

  it('skips v_ prefixed keys', () => {
    const result = guessDefinition({ v_extra: 1, name: 'test' });
    expect(result.arguments).toEqual([{ name: 'name', type: 'String' }]);
  });

  it('guesses Int type for integer values', () => {
    const result = guessDefinition({ count: 5 });
    expect(result.arguments[0].type).toBe('Int');
  });

  it('guesses Float type for non-integer numbers', () => {
    const result = guessDefinition({ price: 3.14 });
    expect(result.arguments[0].type).toBe('Float');
  });

  it('guesses Boolean type', () => {
    const result = guessDefinition({ active: true });
    expect(result.arguments[0].type).toBe('Boolean');
  });

  it('guesses Map type for plain objects', () => {
    const result = guessDefinition({ data: { key: 'val' } });
    expect(result.arguments[0].type).toBe('Map');
  });

  it('guesses [String] type for arrays', () => {
    const result = guessDefinition({ ids: ['a', 'b'] });
    expect(result.arguments[0].type).toBe('[String]');
  });
});

describe('guessExtArgDefinitions', () => {
  it('returns only v_ prefixed entries', () => {
    const result = guessExtArgDefinitions({ v_extra: 1, name: 'test', v_flag: true });
    expect(result).toEqual([
      { name: 'v_extra', type: 'Int' },
      { name: 'v_flag', type: 'Boolean' },
    ]);
  });

  it('returns empty array when no v_ keys', () => {
    const result = guessExtArgDefinitions({ name: 'test' });
    expect(result).toEqual([]);
  });
});

describe('buildGraphQLVariables', () => {
  it('builds variables using default arg builders', () => {
    const args: ArgumentDefinition[] = [
      { name: 'id', type: 'String' },
      { name: 'count', type: 'Int' },
    ];
    const result = buildGraphQLVariables({ id: 'abc', count: 5 }, args, opts);
    expect(result).toEqual({ id: 'abc', count: 5 });
  });

  it('uses custom builder when provided', () => {
    const args: ArgumentDefinition[] = [
      {
        name: 'custom',
        type: 'String',
        builder: (data) => `custom-${data.custom}`,
      },
    ];
    const result = buildGraphQLVariables({ custom: 'val' }, args, opts);
    expect(result).toEqual({ custom: 'custom-val' });
  });

  it('uses argValue fallback for unknown type', () => {
    const args: ArgumentDefinition[] = [{ name: 'data', type: 'CustomType' }];
    const result = buildGraphQLVariables({ data: { raw: true } }, args, opts);
    expect(result).toEqual({ data: { raw: true } });
  });

  it('packs top-level form fields into variables.data for save-style mutations', () => {
    const args: ArgumentDefinition[] = [{ name: 'data', type: 'Map' }];
    const result = buildGraphQLVariables(
      { id: 'dept-1', deptName: 'Platform', parentId: 'root', __typename: 'Dept' },
      args,
      opts,
    );

    expect(result).toEqual({
      data: {
        id: 'dept-1',
        deptName: 'Platform',
        parentId: 'root',
      },
    });
  });
});

describe('buildGraphQLQuery', () => {
  it('builds a query with no args', () => {
    const result = buildGraphQLQuery('query', 'getStatus', undefined, []);
    expect(result).toBe('query getStatus{\ngetStatus()\n}');
  });

  it('builds a mutation with args', () => {
    const args: ArgumentDefinition[] = [
      { name: 'id', type: 'String' },
      { name: 'data', type: 'Map' },
    ];
    const result = buildGraphQLQuery('mutation', 'update', '{id,name}', args);
    expect(result).toContain('mutation update($id:String,$data:Map)');
    expect(result).toContain('update(id:$id,data:$data)');
    expect(result).toContain('{\n{id,name}\n}');
  });

  it('builds query without selection', () => {
    const args: ArgumentDefinition[] = [{ name: 'id', type: 'String' }];
    const result = buildGraphQLQuery('query', 'remove', undefined, args);
    expect(result).toBe('query remove($id:String){\nremove(id:$id)\n}');
  });

  it('builds subscription type', () => {
    const result = buildGraphQLQuery('subscription', 'onChanged', 'id', []);
    expect(result).toContain('subscription onChanged');
  });
});

describe('getOperationName', () => {
  it('extracts operation after last underscore', () => {
    expect(getOperationName('PageProvider__getPage')).toBe('getPage');
  });

  it('returns full action when no underscore', () => {
    expect(getOperationName('getStatus')).toBe('getStatus');
  });

  it('does not split on first underscore only', () => {
    expect(getOperationName('findPage')).toBe('findPage');
  });

  it('extracts from deeply nested name', () => {
    expect(getOperationName('NopAuthUser__update')).toBe('update');
  });
});

describe('operationRegistry', () => {
  it('contains get operation with String id', () => {
    expect(operationRegistry.get.arguments).toContainEqual({ name: 'id', type: 'String' });
  });

  it('contains findPage operation with QueryBeanInput', () => {
    expect(operationRegistry.findPage.arguments).toEqual([{ name: 'query', type: 'QueryBeanInput' }]);
  });

  it('contains batchDelete operation', () => {
    expect(operationRegistry.batchDelete.arguments).toEqual([{ name: 'ids', type: '[String]' }]);
  });

  it('contains batchModify with two args', () => {
    expect(operationRegistry.batchModify.arguments).toHaveLength(2);
  });
});
