import { describe, expect, it } from 'vitest';
import { processSchemaValue } from './processor';

describe('processSchemaValue', () => {
  it('throws on circular schema references', async () => {
    const schema: Record<string, unknown> = { type: 'page' };
    schema.self = schema;

    await expect(processSchemaValue(schema)).rejects.toThrow(
      'AMIS schema contains a circular reference',
    );
  });

  it('throws when schema nesting exceeds max depth', async () => {
    const schema: Record<string, unknown> = { level: 0 };
    let cursor = schema;

    for (let index = 1; index <= 3; index += 1) {
      const child: Record<string, unknown> = { level: index };
      cursor.child = child;
      cursor = child;
    }

    await expect(processSchemaValue(schema, { maxDepth: 2 })).rejects.toThrow(
      'AMIS schema exceeds the maximum supported depth of 2',
    );
  });
});
