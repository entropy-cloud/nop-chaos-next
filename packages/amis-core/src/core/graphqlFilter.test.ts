import { describe, expect, it } from 'vitest';
import type { AmisRequestOptions } from '../types';
import { mergeFilter, toArray, toFilter, toOrderBy } from './graphqlFilter';

const opts: AmisRequestOptions = { url: '' };

describe('toArray', () => {
  it('splits a string by comma delimiter', () => {
    expect(toArray('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('splits by custom delimiter', () => {
    expect(toArray('x|y|z', '|')).toEqual(['x', 'y', 'z']);
  });

  it('returns non-string values as-is', () => {
    expect(toArray(42)).toBe(42);
    expect(toArray(['a', 'b'])).toEqual(['a', 'b']);
    expect(toArray(null)).toBe(null);
    expect(toArray(undefined)).toBe(undefined);
  });

  it('splits single-value string', () => {
    expect(toArray('hello')).toEqual(['hello']);
  });
});

describe('mergeFilter', () => {
  it('returns filterB when filterA is falsy', () => {
    expect(mergeFilter(null, { x: 1 })).toEqual({ x: 1 });
    expect(mergeFilter(undefined, { x: 1 })).toEqual({ x: 1 });
    expect(mergeFilter(false, { x: 1 })).toEqual({ x: 1 });
  });

  it('returns filterA when filterB is falsy', () => {
    expect(mergeFilter({ x: 1 }, null)).toEqual({ x: 1 });
    expect(mergeFilter({ x: 1 }, undefined)).toEqual({ x: 1 });
    expect(mergeFilter({ x: 1 }, false)).toEqual({ x: 1 });
  });

  it('combines two truthy filters with $type and', () => {
    const a = { $type: 'eq', name: 'a' };
    const b = { $type: 'eq', name: 'b' };
    expect(mergeFilter(a, b)).toEqual({ $type: 'and', $body: [a, b] });
  });

  it('returns undefined when both filters are falsy', () => {
    expect(mergeFilter(null, undefined)).toBe(undefined);
  });
});

describe('toOrderBy', () => {
  it('returns undefined for null value', () => {
    expect(toOrderBy(null, 'asc')).toBeUndefined();
  });

  it('returns undefined for undefined value', () => {
    expect(toOrderBy(undefined, 'asc')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(toOrderBy('', 'asc')).toBeUndefined();
  });

  it('returns ascending order by default', () => {
    expect(toOrderBy('name', 'asc')).toEqual([{ name: 'name', desc: false }]);
  });

  it('returns descending order', () => {
    expect(toOrderBy('name', 'desc')).toEqual([{ name: 'name', desc: true }]);
  });

  it('strips _label suffix from field name', () => {
    expect(toOrderBy('status_label', 'asc')).toEqual([{ name: 'status', desc: false }]);
  });

  it('returns array value as-is', () => {
    const arr = [{ name: 'name', desc: false }];
    expect(toOrderBy(arr, 'asc')).toBe(arr);
  });

  it('wraps plain object into array', () => {
    const obj = { name: 'name', desc: false };
    expect(toOrderBy(obj, 'asc')).toEqual([obj]);
  });
});

describe('toFilter', () => {
  it('returns undefined when no filter_ keys present', () => {
    expect(toFilter({ name: 'test' }, opts)).toBeUndefined();
  });

  it('returns undefined when filter_ values are null or empty', () => {
    expect(toFilter({ filter_name: null, filter_age: '' }, opts)).toBeUndefined();
  });

  it('builds eq filter from filter_ keys', () => {
    const result = toFilter({ filter_name: 'Alice' }, opts);
    expect(result).toEqual({
      $type: 'and',
      $body: [{ $type: 'eq', name: 'name', value: 'Alice', min: undefined, max: undefined }],
    });
  });

  it('parses operation from double underscore suffix', () => {
    const result = toFilter({ filter_name__like: 'A%' }, opts);
    expect(result).toEqual({
      $type: 'and',
      $body: [{ $type: 'like', name: 'name', value: 'A%', min: undefined, max: undefined }],
    });
  });

  it('converts __empty sentinel to empty string', () => {
    const result = toFilter({ filter_name: '__empty' }, opts);
    expect(result?.$body[0].value).toBe('');
  });

  it('converts __null sentinel to null', () => {
    const result = toFilter({ filter_name: '__null' }, opts);
    expect(result?.$body[0].value).toBeNull();
  });

  it('handles between operation with array value', () => {
    const result = toFilter({ filter_age__between: '10,20' }, opts);
    expect(result).toEqual({
      $type: 'and',
      $body: [{ $type: 'between', name: 'age', value: undefined, min: '10', max: '20' }],
    });
  });

  it('handles between operation with non-array value', () => {
    const result = toFilter({ filter_age__between: 42 }, opts);
    expect(result).toEqual({
      $type: 'and',
      $body: [{ $type: 'between', name: 'age', value: undefined, min: undefined, max: undefined }],
    });
  });

  it('merges options.filter with and type', () => {
    const options = {
      url: '',
      filter: {
        $type: 'and',
        $body: [{ $type: 'eq', name: 'extra', value: 1 }],
      },
    };
    const result = toFilter({ filter_name: 'test' }, options);
    expect(result?.$body).toHaveLength(2);
  });

  it('merges options.filter with _ type', () => {
    const options = {
      url: '',
      filter: {
        $type: '_',
        $body: [{ $type: 'eq', name: 'extra', value: 1 }],
      },
    };
    const result = toFilter({}, options);
    expect(result).toEqual({
      $type: 'and',
      $body: [{ $type: 'eq', name: 'extra', value: 1 }],
    });
  });

  it('merges options.filter with filter type', () => {
    const options = {
      url: '',
      filter: {
        $type: 'filter',
        $body: [{ $type: 'eq', name: 'extra', value: 1 }],
      },
    };
    const result = toFilter({}, options);
    expect(result?.$body).toHaveLength(1);
  });

  it('pushes other filter types directly', () => {
    const options = {
      url: '',
      filter: { $type: 'eq', name: 'status', value: 'active' },
    };
    const result = toFilter({}, options);
    expect(result).toEqual({
      $type: 'and',
      $body: [{ $type: 'eq', name: 'status', value: 'active' }],
    });
  });

  it('ignores non-object options.filter', () => {
    const result = toFilter({ filter_name: 'test' }, { url: '', filter: 'invalid' as unknown as Record<string, unknown> });
    expect(result?.$body).toHaveLength(1);
  });

  it('filters out non-plain-object entries from $body', () => {
    const options = {
      url: '',
      filter: {
        $type: 'and',
        $body: [{ $type: 'eq', name: 'ok' }, 'string-entry', 42],
      },
    };
    const result = toFilter({}, options);
    expect(result?.$body).toEqual([{ $type: 'eq', name: 'ok' }]);
  });

  it('handles options.filter with non-array $body', () => {
    const options = {
      url: '',
      filter: {
        $type: 'and',
        $body: 'not-an-array',
      },
    };
    const result = toFilter({}, options);
    expect(result).toBeUndefined();
  });
});
