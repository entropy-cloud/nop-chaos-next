import { Plus } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from '@nop-chaos/ui';
import { getTableRowClassName } from '../../../../../lib/tableRowClassName';
import { useTranslation } from 'react-i18next';
import type { OrderItem, OrderRecord } from '../../../../../services/mockApi';
import type { ValidationErrors } from '../types';
import { calculateSubtotal } from '../utils';

interface ItemsSectionProps {
  filteredItems: OrderItem[];
  dirty: boolean;
  errors: ValidationErrors;
  restoreItems: () => void;
  setDraft: React.Dispatch<React.SetStateAction<OrderRecord | null>>;
  markDirty: (section: 'items') => void;
  updateItem: (itemId: string, patch: Partial<OrderItem>) => void;
  removeItem: (itemId: string) => void;
}

export function ItemsSection({
  filteredItems,
  dirty,
  errors,
  restoreItems,
  setDraft,
  markDirty,
  updateItem,
  removeItem,
}: ItemsSectionProps) {
  const { t } = useTranslation();
  const parseNumberInput = (value: string, fallback: number) => {
    if (!value.trim()) {
      return fallback;
    }

    const next = Number(value);
    return Number.isNaN(next) ? fallback : next;
  };

  return (
    <Card className="theme-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          {t('masterDetail.detail.itemsTitle')}
          {dirty ? (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--danger))]" />
          ) : null}
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restoreItems}>
            {t('masterDetail.detail.restoreSection')}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setDraft((state) =>
                state
                  ? {
                      ...state,
                      items: [
                        ...state.items,
                        {
                          id: `item-${Date.now()}`,
                          product: t('masterDetail.detail.newProduct'),
                          quantity: 1,
                          price: 0,
                        },
                      ],
                    }
                  : state,
              );
              markDirty('items');
            }}
          >
            <Plus className="size-4" />
            {t('masterDetail.detail.add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-white/25 dark:bg-slate-900/20">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('masterDetail.detail.itemColumns.product')}</TableHead>
                <TableHead>{t('masterDetail.detail.itemColumns.quantity')}</TableHead>
                <TableHead>{t('masterDetail.detail.itemColumns.price')}</TableHead>
                <TableHead>{t('masterDetail.detail.itemColumns.subtotal')}</TableHead>
                <TableHead className="text-right">{t('masterDetail.columns.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map((item) => {
                const quantityError = errors[`item:${item.id}:quantity`];
                const priceError = errors[`item:${item.id}:price`];

                return (
                  <TableRow
                    key={item.id}
                    className={cn(
                      getTableRowClassName('subtle'),
                      dirty && 'bg-[color-mix(in_hsl,hsl(var(--warning))_6%,transparent)]',
                    )}
                  >
                    <TableCell>
                      <Input
                        value={item.product}
                        onChange={(event) => updateItem(item.id, { product: event.target.value })}
                      />
                      {!item.product.trim() ? (
                        <div className="mt-1 text-sm text-[hsl(var(--danger))]">
                          {t('masterDetail.detail.errors.productRequired')}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, {
                            quantity: parseNumberInput(event.target.value, item.quantity),
                          })
                        }
                        className={quantityError ? 'border-[hsl(var(--danger))]' : ''}
                      />
                      {quantityError ? (
                        <div className="mt-1 text-sm text-[hsl(var(--danger))]">
                          {quantityError}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(event) =>
                          updateItem(item.id, { price: parseNumberInput(event.target.value, item.price) })
                        }
                        className={priceError ? 'border-[hsl(var(--danger))]' : ''}
                      />
                      {priceError ? (
                        <div className="mt-1 text-sm text-[hsl(var(--danger))]">{priceError}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>￥{calculateSubtotal(item).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => removeItem(item.id)}>
                          {t('common.delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
