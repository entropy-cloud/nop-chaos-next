import type { OrderItem, OrderRecord } from '../../../../services/mockApi';
import type { ValidationErrors } from './types';

export function calculateSubtotal(item: OrderItem) {
  return item.quantity * item.price;
}

export function normalizeOrder(order: OrderRecord): OrderRecord {
  return structuredClone(order);
}

export function hasOrderChanged(left: OrderRecord | null, right: OrderRecord | null) {
  if (!left || !right) {
    return left !== right;
  }

  return JSON.stringify(left) !== JSON.stringify(right);
}

export function shouldApplyOrderResult(activeOrderId: string, order: Pick<OrderRecord, 'id'>) {
  return order.id === activeOrderId;
}

export function containsIgnoreCase(value: string, keyword: string) {
  return value.toLowerCase().includes(keyword.trim().toLowerCase());
}

export function buildValidationErrors(
  order: OrderRecord,
  t: (key: string) => string,
): ValidationErrors {
  const nextErrors: ValidationErrors = {};

  order.items.forEach((item) => {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      nextErrors[`item:${item.id}:quantity`] = t(
        'masterDetail.detail.errors.quantityPositiveInteger',
      );
    }
    if (!(item.price > 0)) {
      nextErrors[`item:${item.id}:price`] = t('masterDetail.detail.errors.pricePositive');
    }
  });

  if (order.addresses.filter((item) => item.isDefault).length !== 1) {
    nextErrors['addresses:default'] = t('masterDetail.detail.errors.singleDefaultAddress');
  }

  order.logistics.forEach((item) => {
    if (item.shippingStatus !== 'pending' && !item.trackingNo.trim()) {
      nextErrors[`logistics:${item.id}:trackingNo`] = t(
        'masterDetail.detail.errors.trackingRequired',
      );
    }
  });

  return nextErrors;
}
