import type { AmisSchemaRecord, ProcessSchemaOptions } from '../types';

const DEFAULT_MAX_SCHEMA_DEPTH = 100;

function isRecord(value: unknown): value is AmisSchemaRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function processSchemaValue(
  value: unknown,
  options: ProcessSchemaOptions = {},
): Promise<unknown> {
  const seen = new WeakSet<object>();
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_SCHEMA_DEPTH;

  async function visit(currentValue: unknown, depth: number): Promise<unknown> {
    if (depth > maxDepth) {
      throw new Error(`AMIS schema exceeds the maximum supported depth of ${maxDepth}`);
    }

    if (Array.isArray(currentValue)) {
      const processed = await Promise.all(currentValue.map((item) => visit(item, depth + 1)));
      return processed.filter((item) => item !== null);
    }

    if (!isRecord(currentValue)) {
      return currentValue;
    }

    if (seen.has(currentValue)) {
      throw new Error('AMIS schema contains a circular reference');
    }

    seen.add(currentValue);

    try {
      const processedObject = await options.onObject?.(currentValue);
      const nextValue = processedObject === undefined ? currentValue : processedObject;

      if (nextValue === null) {
        return null;
      }

      const result: AmisSchemaRecord = {};

      for (const [key, childValue] of Object.entries(nextValue)) {
        const processedChild = await visit(childValue, depth + 1);
        if (processedChild !== null) {
          result[key] = processedChild;
        }
      }

      return result;
    } finally {
      seen.delete(currentValue);
    }
  }

  return visit(value, 1);
}
