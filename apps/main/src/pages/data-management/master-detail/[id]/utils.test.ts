import { describe, expect, it } from 'vitest';
import {
  calculateSubtotal,
  normalizeOrder,
  hasOrderChanged,
  shouldApplyOrderResult,
  containsIgnoreCase,
  buildValidationErrors,
} from './utils';
import type { OrderRecord } from '../../../../services/mockApi';

const t = (key: string) => key;

describe('master-detail utils', () => {
  describe('calculateSubtotal', () => {
    it('calculates quantity * price', () => {
      expect(calculateSubtotal({ id: '1', product: 'A', quantity: 3, price: 100 })).toBe(300);
    });
  });

  describe('normalizeOrder', () => {
    it('returns a deep clone', () => {
      const order = { id: '1', items: [{ id: 'i1' }] } as unknown as OrderRecord;
      const normalized = normalizeOrder(order);
      expect(normalized).toEqual(order);
      expect(normalized).not.toBe(order);
    });
  });

  describe('hasOrderChanged', () => {
    it('returns false for identical objects', () => {
      const order = { id: '1' } as OrderRecord;
      expect(hasOrderChanged(order, order)).toBe(false);
    });

    it('returns true when one is null and the other is not', () => {
      expect(hasOrderChanged(null, { id: '1' } as OrderRecord)).toBe(true);
      expect(hasOrderChanged({ id: '1' } as OrderRecord, null)).toBe(true);
    });

    it('returns false when both are null', () => {
      expect(hasOrderChanged(null, null)).toBe(false);
    });

    it('returns true for different values', () => {
      const a = { id: '1', name: 'a' } as unknown as OrderRecord;
      const b = { id: '1', name: 'b' } as unknown as OrderRecord;
      expect(hasOrderChanged(a, b)).toBe(true);
    });
  });

  describe('containsIgnoreCase', () => {
    it('finds substring case-insensitively', () => {
      expect(containsIgnoreCase('Hello World', 'hello')).toBe(true);
      expect(containsIgnoreCase('Hello World', 'WORLD')).toBe(true);
    });

    it('returns false when not found', () => {
      expect(containsIgnoreCase('Hello', 'xyz')).toBe(false);
    });

    it('trims the keyword', () => {
      expect(containsIgnoreCase('hello', '  hello  ')).toBe(true);
    });
  });

  describe('shouldApplyOrderResult', () => {
    it('returns true when saved order still belongs to current route id', () => {
      expect(shouldApplyOrderResult('1001', { id: '1001' } as OrderRecord)).toBe(true);
    });

    it('returns false when saved order belongs to an old route id', () => {
      expect(shouldApplyOrderResult('1002', { id: '1001' } as OrderRecord)).toBe(false);
    });
  });

  describe('buildValidationErrors', () => {
    const baseOrder: OrderRecord = {
      id: '1',
      orderNo: 'SO-1',
      customerName: 'Test',
      status: 'active',
      owner: 'A',
      createdAt: '',
      updatedAt: '',
      amount: 0,
      channel: '',
      items: [{ id: 'i1', product: 'P', quantity: 2, price: 10 }],
      addresses: [{ id: 'a1', receiver: 'R', phone: '123', province: 'P', city: 'C', address: 'A', isDefault: true }],
      logistics: [{ id: 'l1', company: 'C', trackingNo: 'TN1', shippingStatus: 'pending' as const, eta: '', note: '', timeline: [] }],
    };

    it('returns empty errors for valid order', () => {
      expect(buildValidationErrors(baseOrder, t)).toEqual({});
    });

    it('flags non-positive-integer quantity', () => {
      const order = { ...baseOrder, items: [{ id: 'i1', product: 'P', quantity: -1, price: 10 }] };
      const errors = buildValidationErrors(order, t);
      expect(errors['item:i1:quantity']).toBe('masterDetail.detail.errors.quantityPositiveInteger');
    });

    it('flags non-integer quantity', () => {
      const order = { ...baseOrder, items: [{ id: 'i1', product: 'P', quantity: 1.5, price: 10 }] };
      const errors = buildValidationErrors(order, t);
      expect(errors['item:i1:quantity']).toBe('masterDetail.detail.errors.quantityPositiveInteger');
    });

    it('flags zero price', () => {
      const order = { ...baseOrder, items: [{ id: 'i1', product: 'P', quantity: 1, price: 0 }] };
      const errors = buildValidationErrors(order, t);
      expect(errors['item:i1:price']).toBe('masterDetail.detail.errors.pricePositive');
    });

    it('flags negative price', () => {
      const order = { ...baseOrder, items: [{ id: 'i1', product: 'P', quantity: 1, price: -5 }] };
      const errors = buildValidationErrors(order, t);
      expect(errors['item:i1:price']).toBe('masterDetail.detail.errors.pricePositive');
    });

    it('flags no default address', () => {
      const order = {
        ...baseOrder,
        addresses: [{ ...baseOrder.addresses[0], isDefault: false }],
      };
      const errors = buildValidationErrors(order, t);
      expect(errors['addresses:default']).toBe('masterDetail.detail.errors.singleDefaultAddress');
    });

    it('flags multiple default addresses', () => {
      const order = {
        ...baseOrder,
        addresses: [
          { ...baseOrder.addresses[0], id: 'a1', isDefault: true },
          { ...baseOrder.addresses[0], id: 'a2', isDefault: true },
        ],
      };
      const errors = buildValidationErrors(order, t);
      expect(errors['addresses:default']).toBe('masterDetail.detail.errors.singleDefaultAddress');
    });

    it('flags missing tracking number for shipped logistics', () => {
      const order = {
        ...baseOrder,
        logistics: [{ ...baseOrder.logistics[0], shippingStatus: 'shipping' as const, trackingNo: '  ' }],
      };
      const errors = buildValidationErrors(order, t);
      expect(errors['logistics:l1:trackingNo']).toBe('masterDetail.detail.errors.trackingRequired');
    });

    it('allows empty tracking number for pending logistics', () => {
      const order = {
        ...baseOrder,
        logistics: [{ ...baseOrder.logistics[0], shippingStatus: 'pending' as const, trackingNo: '' }],
      };
      const errors = buildValidationErrors(order, t);
      expect(errors['logistics:l1:trackingNo']).toBeUndefined();
    });
  });
});
