import { describe, expect, it } from 'vitest';
import { shouldApplyOrderResult } from './utils';

describe('master-detail route ownership', () => {
  it('accepts save results for the active order id only', () => {
    expect(shouldApplyOrderResult('1001', { id: '1001' })).toBe(true);
    expect(shouldApplyOrderResult('1002', { id: '1001' })).toBe(false);
  });
});
