import { describe, expect, it } from 'vitest';
import type { OrderRecord } from '../../../../services/mockApi';
import { hasOrderChanged, normalizeOrder } from './utils';

const sampleOrder: OrderRecord = {
  id: 'order-1',
  orderNo: 'SO-1001',
  customerName: 'Acme',
  status: 'active',
  channel: 'Portal',
  owner: 'Alice',
  amount: 100,
  createdAt: '2026-05-15T00:00:00.000Z',
  updatedAt: '2026-05-15T00:00:00.000Z',
  items: [
    {
      id: 'item-1',
      product: 'Product Alpha',
      quantity: 1,
      price: 100,
    },
  ],
  addresses: [
    {
      id: 'addr-1',
      receiver: 'Alice',
      phone: '13800000000',
      province: 'Zhejiang',
      city: 'Hangzhou',
      address: 'No. 1 Road',
      isDefault: true,
    },
  ],
  logistics: [
    {
      id: 'log-1',
      company: 'SF Express',
      trackingNo: 'TRACK-1',
      shippingStatus: 'delivered',
      eta: '2026-05-16',
      note: '',
      timeline: ['created'],
    },
  ],
};

describe('master-detail detail utils', () => {
  it('treats cloned but identical orders as unchanged', () => {
    const saved = normalizeOrder(sampleOrder);
    const draft = normalizeOrder(sampleOrder);

    expect(hasOrderChanged(draft, saved)).toBe(false);
  });

  it('detects user edits against the saved snapshot', () => {
    const saved = normalizeOrder(sampleOrder);
    const draft = normalizeOrder(sampleOrder);
    draft.items[0].quantity = 2;

    expect(hasOrderChanged(draft, saved)).toBe(true);
  });
});
