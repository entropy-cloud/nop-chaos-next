import { describe, it, expect } from 'vitest';
import { mergeProperty, mergeArray, resolvePrototypes, cleanupXProps, mergeNode } from './index';

describe('mergeProperty', () => {
  it('merges scalars (derived wins)', () => {
    expect(mergeProperty(1, 2)).toBe(2);
    expect(mergeProperty('a', 'b')).toBe('b');
    expect(mergeProperty(null, 'val')).toBe('val');
  });

  it('replace override', () => {
    expect(mergeProperty({ a: 1 }, { b: 2 }, 'replace')).toEqual({ b: 2 });
  });

  it('remove override', () => {
    expect(mergeProperty({ a: 1 }, { b: 2 }, 'remove')).toBeUndefined();
  });

  it('merge-replace: shallow merge then replace sub-objects', () => {
    const base = { a: 1, b: { c: 2 } };
    const derived = { b: { d: 3 }, e: 4 };
    const result = mergeProperty(base, derived, 'merge-replace') as Record<string, unknown>;
    expect(result.a).toBe(1);
    expect(result.e).toBe(4);
    expect(result.b).toEqual({ d: 3 });
  });

  it('bounded-merge: only keys present in both', () => {
    const base = { a: 1, b: 2, c: 3 };
    const derived = { b: 20, d: 4 };
    const result = mergeProperty(base, derived, 'bounded-merge') as Record<string, unknown>;
    expect(result).toEqual({ b: 20 });
  });

  it('default merge: objects recurse', () => {
    const base = { a: 1, b: { c: 2 } };
    const derived = { b: { d: 3 }, e: 4 };
    const result = mergeProperty(base, derived) as Record<string, unknown>;
    expect(result.a).toBe(1);
    expect(result.e).toBe(4);
    expect(result.b).toEqual({ c: 2, d: 3 });
  });
});

describe('mergeArray', () => {
  it('merges arrays by id', () => {
    const base = [
      { id: 'a', value: 1 },
      { id: 'b', value: 2 },
    ];
    const derived = [
      { id: 'b', value: 22 },
      { id: 'c', value: 3 },
    ];
    const result = mergeArray(base, derived) as Array<Record<string, unknown>>;
    expect(result).toHaveLength(3);
    const bItem = result.find((x: Record<string, unknown>) => x.id === 'b') as Record<
      string,
      unknown
    >;
    expect(bItem.value).toBe(22);
  });

  it('supports x:override remove on arrays', () => {
    const base = [{ id: 'a', value: 1 }];
    const derived = [{ id: 'a', 'x:override': 'remove' }];
    const result = mergeArray(base, derived);
    expect(result).toHaveLength(0);
  });

  it('preserves base items not in derived', () => {
    const base = [{ id: 'a', value: 1 }];
    const derived: unknown[] = [];
    const result = mergeArray(base, derived);
    expect(result).toHaveLength(1);
  });
});

describe('resolvePrototypes', () => {
  it('clones and merges prototype in array', () => {
    const node = {
      forms: [
        { id: 'edit', title: 'Edit', body: 'form-body' },
        {
          id: 'add',
          'x:prototype': 'edit',
          title: 'Add',
        },
      ],
    };
    const result = resolvePrototypes(node) as Record<string, unknown>;
    const forms = result.forms as Array<Record<string, unknown>>;
    expect(forms).toHaveLength(2);
    const addItem = forms.find((f: Record<string, unknown>) => f.id === 'add') as Record<
      string,
      unknown
    >;
    expect(addItem.title).toBe('Add');
    expect(addItem.body).toBe('form-body');
    expect(addItem['x:prototype']).toBeUndefined();
  });
});

describe('cleanupXProps', () => {
  it('removes all x:* properties', () => {
    const node = {
      'x:extends': './base.json',
      'x:override': 'merge',
      title: 'hello',
      body: {
        'x:override': 'replace',
        type: 'form',
      },
    };
    const result = cleanupXProps(node) as Record<string, unknown>;
    expect(result['x:extends']).toBeUndefined();
    expect(result['x:override']).toBeUndefined();
    expect(result.title).toBe('hello');
    expect((result.body as Record<string, unknown>)['x:override']).toBeUndefined();
    expect((result.body as Record<string, unknown>).type).toBe('form');
  });
});

describe('mergeNode', () => {
  it('throws on circular x:extends', async () => {
    const loader = async (path: string) => {
      if (path === './a.json') return { 'x:extends': './b.json' };
      if (path === './b.json') return { 'x:extends': './a.json' };
      return null;
    };
    await expect(mergeNode({ 'x:extends': './a.json' }, { loader, baseDir: '.' })).rejects.toThrow(
      /Circular/,
    );
  });

  it('throws on loader failure', async () => {
    const loader = async () => null;
    await expect(
      mergeNode({ 'x:extends': './missing.json' }, { loader, baseDir: '.' }),
    ).rejects.toThrow(/Failed to load/);
  });

  it('merges single extends chain', async () => {
    const files: Record<string, unknown> = {
      './base.json': {
        type: 'page',
        title: 'Base',
        body: { type: 'service', api: '/api/data' },
      },
    };
    const loader = async (path: string) => files[path] ?? null;
    const result = (await mergeNode(
      { 'x:extends': './base.json', title: 'Derived', body: { body: { type: 'form' } } },
      { loader, baseDir: '.' },
    )) as Record<string, unknown>;
    expect(result.type).toBe('page');
    expect(result.title).toBe('Derived');
    expect((result.body as Record<string, unknown>).type).toBe('service');
    expect((result.body as Record<string, unknown>).api).toBe('/api/data');
    expect((result.body as Record<string, unknown>)['x:extends']).toBeUndefined();
  });

  it('merges chained extends (A -> B -> C)', async () => {
    const files: Record<string, unknown> = {
      './c.json': { level: 'C', value: 1 },
      './b.json': { 'x:extends': './c.json', level: 'B', value: 2 },
      './a.json': { 'x:extends': './b.json', level: 'A' },
    };
    const loader = async (path: string) => files[path] ?? null;
    const result = (await mergeNode(files['./a.json'] as Record<string, unknown>, {
      loader,
      baseDir: '.',
    })) as Record<string, unknown>;
    expect(result.level).toBe('A');
    expect(result.value).toBe(2);
  });

  it('handles x:override replace on nested property', async () => {
    const files: Record<string, unknown> = {
      './base.json': {
        body: { type: 'service', body: { type: 'table', columns: ['a', 'b'] } },
      },
    };
    const loader = async (path: string) => files[path] ?? null;
    const result = (await mergeNode(
      {
        'x:extends': './base.json',
        body: {
          body: {
            'x:override': 'replace',
            type: 'form',
          },
        },
      },
      { loader, baseDir: '.' },
    )) as Record<string, unknown>;
    const body = (result.body as Record<string, unknown>).body as Record<string, unknown>;
    expect(body.type).toBe('form');
    expect(body.columns).toBeUndefined();
  });

  it('cleans all x:* props after merge', async () => {
    const result = (await mergeNode(
      { 'x:override': 'merge', title: 'test', body: { 'x:override': 'replace', type: 'form' } },
      { loader: async () => ({}), baseDir: '.' },
    )) as Record<string, unknown>;
    expect(result['x:override']).toBeUndefined();
    expect((result.body as Record<string, unknown>)['x:override']).toBeUndefined();
    expect(result.title).toBe('test');
  });
});
