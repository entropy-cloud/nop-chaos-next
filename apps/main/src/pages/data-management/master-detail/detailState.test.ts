import { describe, expect, it } from 'vitest';
import { shouldRenderDetailError } from './detailState';

describe('master-detail detail state', () => {
  it('prefers error state over loading when the first fetch fails', () => {
    expect(shouldRenderDetailError(null, true)).toBe(true);
    expect(shouldRenderDetailError(null, false)).toBe(false);
  });

  it('keeps rendered draft content visible during background errors', () => {
    expect(
      shouldRenderDetailError(
        {
          id: 'order-1',
          orderNo: 'SO-1001',
          customerName: 'Acme',
          status: 'active',
          channel: 'Portal',
          owner: 'Alice',
          amount: 100,
          createdAt: '2026-05-15T00:00:00.000Z',
          updatedAt: '2026-05-15T00:00:00.000Z',
          items: [],
          addresses: [],
          logistics: [],
        },
        true,
      ),
    ).toBe(false);
  });
});
