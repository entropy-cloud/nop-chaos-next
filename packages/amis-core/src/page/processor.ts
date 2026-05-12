import type { AmisSchemaRecord, ProcessSchemaOptions } from '../types';

function isRecord(value: unknown): value is AmisSchemaRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function processSchemaValue(
  value: unknown,
  options: ProcessSchemaOptions = {},
): Promise<unknown> {
  if (Array.isArray(value)) {
    const processed = await Promise.all(value.map((item) => processSchemaValue(item, options)));
    return processed.filter((item) => item !== null);
  }

  if (!isRecord(value)) {
    return value;
  }

  const processedObject = await options.onObject?.(value);
  const nextValue = processedObject === undefined ? value : processedObject;

  if (nextValue === null) {
    return null;
  }

  const result: AmisSchemaRecord = {};

  for (const [key, childValue] of Object.entries(nextValue)) {
    const processedChild = await processSchemaValue(childValue, options);
    if (processedChild !== null) {
      result[key] = processedChild;
    }
  }

  return result;
}
