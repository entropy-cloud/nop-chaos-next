import type {
  AddressRecord,
  LogisticsRecord,
  OrderItem,
  OrderRecord,
} from '../../../../services/mockApi';

export type DirtySectionKey = 'items' | 'addresses' | 'logistics';

export type DirtySections = Record<DirtySectionKey, boolean>;

export type ValidationErrors = Record<string, string>;

export interface DetailSectionCommonProps {
  dirty: boolean;
  restoreLabel: string;
  onRestore: () => void;
}

export type UpdateItem = (itemId: string, patch: Partial<OrderItem>) => void;

export type UpdateOrderDraft = React.Dispatch<React.SetStateAction<OrderRecord | null>>;

export type SetAddressRecord = React.Dispatch<React.SetStateAction<AddressRecord | null>>;

export type SetLogisticsRecord = React.Dispatch<React.SetStateAction<LogisticsRecord | null>>;
