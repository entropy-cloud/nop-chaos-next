import { mergeArray } from './mergeArray.js';

export type OverrideOp = 'merge' | 'replace' | 'remove' | 'bounded-merge' | 'merge-replace';

export function mergeProperty(
  baseVal: unknown,
  derivedVal: unknown,
  overrideOp: OverrideOp = 'merge',
): unknown {
  if (derivedVal === undefined) {
    return baseVal;
  }

  if (overrideOp === 'replace') {
    return deepClone(derivedVal);
  }

  if (overrideOp === 'remove') {
    return undefined;
  }

  if (overrideOp === 'merge-replace') {
    if (isPlainObject(baseVal) && isPlainObject(derivedVal)) {
      return {
        ...(baseVal as Record<string, unknown>),
        ...(derivedVal as Record<string, unknown>),
      };
    }
    return deepClone(derivedVal);
  }

  if (overrideOp === 'bounded-merge') {
    if (isPlainObject(baseVal) && isPlainObject(derivedVal)) {
      const base = baseVal as Record<string, unknown>;
      const derived = derivedVal as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const key of Object.keys(base)) {
        if (key in derived) {
          result[key] = mergeProperty(base[key], derived[key]);
        }
      }
      return result;
    }
    return deepClone(derivedVal);
  }

  // default: 'merge'
  if (isPlainObject(baseVal) && isPlainObject(derivedVal)) {
    return mergeObjects(baseVal as Record<string, unknown>, derivedVal as Record<string, unknown>);
  }

  if (Array.isArray(baseVal) && Array.isArray(derivedVal)) {
    return mergeArray(baseVal, derivedVal);
  }

  if (typeof baseVal !== typeof derivedVal || baseVal === null || derivedVal === null) {
    return deepClone(derivedVal);
  }

  return deepClone(derivedVal);
}

export function mergeObjects(
  base: Record<string, unknown>,
  derived: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const allKeys = new Set([...Object.keys(base), ...Object.keys(derived)]);

  for (const key of allKeys) {
    if (key.startsWith('x:') && key !== 'x:override') continue;
    const derivedVal = derived[key];
    let op: OverrideOp = 'merge';
    if (isPlainObject(derivedVal)) {
      const derivedOp = (derivedVal as Record<string, unknown>)['x:override'];
      if (typeof derivedOp === 'string' && isOverrideOp(derivedOp)) {
        op = derivedOp;
      }
    }
    result[key] = mergeProperty(base[key], derivedVal, op);
  }

  return result;
}

function isOverrideOp(val: string): val is OverrideOp {
  return ['merge', 'replace', 'remove', 'bounded-merge', 'merge-replace'].includes(val);
}

export function isPlainObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

export function deepClone<T>(val: T): T {
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(deepClone) as unknown as T;
  const cloned: Record<string, unknown> = {};
  for (const key of Object.keys(val as Record<string, unknown>)) {
    cloned[key] = deepClone((val as Record<string, unknown>)[key]);
  }
  return cloned as T;
}
