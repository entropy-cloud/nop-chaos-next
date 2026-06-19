import { mergeProperty, isPlainObject, deepClone } from './mergeProperty.js';
import type { OverrideOp } from './mergeProperty.js';

export function resolvePrototypes(node: unknown): unknown {
  if (!isPlainObject(node)) return node;

  const obj = node as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const val = obj[key];

    if (key.startsWith('x:')) {
      if (key === 'x:prototype') continue;
      result[key] = val;
      continue;
    }

    if (Array.isArray(val)) {
      result[key] = resolvePrototypeArray(val);
    } else if (isPlainObject(val)) {
      result[key] = resolvePrototypes(val);
    } else {
      result[key] = val;
    }
  }

  return result;
}

function resolvePrototypeArray(arr: unknown[]): unknown[] {
  const items = arr.map((item) =>
    isPlainObject(item) ? { ...(item as Record<string, unknown>) } : item,
  );

  for (const item of items) {
    if (!isPlainObject(item)) continue;
    const obj = item as Record<string, unknown>;
    const protoId = obj['x:prototype'];
    if (typeof protoId !== 'string') continue;

    const source = findById(items, protoId);
    if (!source) continue;

    const sourceClone = deepClone(source);
    const overrideOp = (obj['x:prototype-override'] as OverrideOp) || 'merge';

    for (const key of Object.keys(obj)) {
      if (key === 'x:prototype' || key === 'x:prototype-override') continue;
      (sourceClone as Record<string, unknown>)[key] = mergeProperty(
        (sourceClone as Record<string, unknown>)[key],
        obj[key],
        overrideOp,
      );
    }

    Object.assign(obj, sourceClone);
    delete obj['x:prototype'];
    delete obj['x:prototype-override'];
  }

  return items;
}

function findById(items: unknown[], id: string): unknown | undefined {
  return items.find((item) => isPlainObject(item) && (item as Record<string, unknown>).id === id);
}
