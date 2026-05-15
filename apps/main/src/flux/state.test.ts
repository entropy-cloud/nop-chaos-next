import { describe, expect, it } from 'vitest';
import { shouldResetFluxState } from './state';

describe('flux route state reset', () => {
  it('resets rendered schema when schemaPath changes', () => {
    expect(shouldResetFluxState('/mock/a.json', '/mock/b.json')).toBe(true);
    expect(shouldResetFluxState('/mock/a.json', '/mock/a.json')).toBe(false);
  });
});
