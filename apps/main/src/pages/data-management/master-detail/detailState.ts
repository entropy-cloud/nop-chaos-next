import type { OrderRecord } from '../../../services/mockApi';

export function shouldRenderDetailError(draft: OrderRecord | null, isError: boolean) {
  return !draft && isError;
}
