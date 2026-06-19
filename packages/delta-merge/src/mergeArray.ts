import { mergeProperty, isPlainObject, deepClone } from './mergeProperty.js';
import type { OverrideOp } from './mergeProperty.js';

export function mergeArray(baseArr: unknown[], derivedArr: unknown[]): unknown[] {
  const baseMap = new Map<string | number, unknown>();
  const result: unknown[] = [];

  for (const item of baseArr) {
    if (isPlainObject(item) && 'id' in (item as Record<string, unknown>)) {
      const id = (item as Record<string, unknown>).id as string | number;
      baseMap.set(id, item);
    }
  }

  for (const derived of derivedArr) {
    if (!isPlainObject(derived)) {
      result.push(deepClone(derived));
      continue;
    }

    const d = derived as Record<string, unknown>;

    if (d['x:override'] === 'remove' && d.id != null) {
      baseMap.delete(d.id as string | number);
      continue;
    }

    if (d.id != null && baseMap.has(d.id as string | number)) {
      const base = baseMap.get(d.id as string | number)!;
      result.push(mergeNodeWithBase(base, d));
      baseMap.delete(d.id as string | number);
    } else {
      result.push(deepClone(derived));
    }
  }

  for (const remaining of baseMap.values()) {
    result.push(deepClone(remaining));
  }

  return result;
}

function mergeNodeWithBase(base: unknown, derived: Record<string, unknown>): unknown {
  if (!isPlainObject(base)) return deepClone(derived);
  const baseObj = base as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const allKeys = new Set([...Object.keys(baseObj), ...Object.keys(derived)]);
  for (const key of allKeys) {
    if (key.startsWith('x:') && key !== 'x:override') continue;
    const overrideStr = derived['x:override'];
    const op = typeof overrideStr === 'string' ? overrideStr : 'merge';
    result[key] = mergeProperty(baseObj[key], derived[key], op as OverrideOp);
  }
  return result;
}
