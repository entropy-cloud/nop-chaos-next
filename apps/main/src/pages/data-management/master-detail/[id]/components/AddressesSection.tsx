import { Plus } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Switch } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type { AddressRecord, OrderRecord } from '../../../../../services/mockApi';
import type { ValidationErrors } from '../types';

interface AddressesSectionProps {
  draft: OrderRecord;
  filteredAddresses: AddressRecord[];
  dirty: boolean;
  errors: ValidationErrors;
  restoreAddresses: () => void;
  setEditingAddress: React.Dispatch<React.SetStateAction<AddressRecord | null>>;
  setAddressDialogOpen: (open: boolean) => void;
  setDraft: React.Dispatch<React.SetStateAction<OrderRecord | null>>;
  markDirty: (section: 'addresses') => void;
}

export function AddressesSection({
  draft,
  filteredAddresses,
  dirty,
  errors,
  restoreAddresses,
  setEditingAddress,
  setAddressDialogOpen,
  setDraft,
  markDirty,
}: AddressesSectionProps) {
  const { t } = useTranslation();

  return (
    <Card className="theme-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          {t('masterDetail.detail.addressesTitle')}
          {dirty ? (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--danger))]" />
          ) : null}
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restoreAddresses}>
            {t('masterDetail.detail.restoreSection')}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingAddress({
                id: `addr-${Date.now()}`,
                receiver: '',
                phone: '',
                province: '',
                city: '',
                address: '',
                isDefault: draft.addresses.length === 0,
              });
              setAddressDialogOpen(true);
            }}
          >
            <Plus className="size-4" />
            {t('masterDetail.detail.addAddress')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {errors['addresses:default'] ? (
          <div className="rounded-xl border border-[hsl(var(--danger))] bg-[hsl(var(--danger-bg))] px-3 py-2 text-sm text-[hsl(var(--danger))]">
            {errors['addresses:default']}
          </div>
        ) : null}
        {filteredAddresses.map((address) => (
          <div
            key={address.id}
            className="rounded-xl border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">{address.receiver}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {address.province} {address.city} {address.address}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">{address.phone}</div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={address.isDefault}
                  onCheckedChange={(checked) => {
                    setDraft((state) =>
                      state
                        ? {
                            ...state,
                            addresses: state.addresses.map((item) => ({
                              ...item,
                              isDefault: checked
                                ? item.id === address.id
                                : item.isDefault && item.id !== address.id,
                            })),
                          }
                        : state,
                    );
                    markDirty('addresses');
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingAddress(address);
                    setAddressDialogOpen(true);
                  }}
                >
                  {t('common.edit')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!window.confirm(t('masterDetail.detail.deleteAddressConfirm'))) {
                      return;
                    }
                    setDraft((state) =>
                      state
                        ? {
                            ...state,
                            addresses: state.addresses.filter((item) => item.id !== address.id),
                          }
                        : state,
                    );
                    markDirty('addresses');
                  }}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
