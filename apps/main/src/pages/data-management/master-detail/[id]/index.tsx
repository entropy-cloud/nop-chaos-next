import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { RefreshCw, RotateCcw, Save } from 'lucide-react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, toast } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../../components/common/PageHeader';
import { confirmInApp } from '../../../../services/confirm';
import {
  fetchOrderDetail,
  saveOrderDetail,
  type AddressRecord,
  type LogisticsRecord,
  type OrderItem,
  type OrderRecord,
} from '../../../../services/mockApi';
import { AddressDialog } from './components/AddressDialog';
import { AddressesSection } from './components/AddressesSection';
import { FilterToolbar } from './components/FilterToolbar';
import { ItemsSection } from './components/ItemsSection';
import { LogisticsDrawer } from './components/LogisticsDrawer';
import { LogisticsSection } from './components/LogisticsSection';
import { SummaryCard } from './components/SummaryCard';
import { shouldRenderDetailError } from '../detailState';
import type { DirtySectionKey, DirtySections, ValidationErrors } from './types';
import {
  buildValidationErrors,
  containsIgnoreCase,
  hasOrderChanged,
  normalizeOrder,
  shouldApplyOrderResult,
} from './utils';

export default function MasterDetailDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const detailQuery = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () => fetchOrderDetail(id),
  });
  const [draft, setDraft] = useState<OrderRecord | null>(null);
  const [savedState, setSavedState] = useState<OrderRecord | null>(null);
  const [dirtySections, setDirtySections] = useState<DirtySections>({
    items: false,
    addresses: false,
    logistics: false,
  });
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(null);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [editingLogistics, setEditingLogistics] = useState<LogisticsRecord | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [itemKeyword, setItemKeyword] = useState('');
  const [addressKeyword, setAddressKeyword] = useState('');
  const [logisticsKeyword, setLogisticsKeyword] = useState('');
  const savedStateRef = useRef<OrderRecord | null>(null);

  useEffect(() => {
    savedStateRef.current = savedState;
  }, [savedState]);

  useEffect(() => {
    setDraft(null);
    setSavedState(null);
    savedStateRef.current = null;
    setDirtySections({ items: false, addresses: false, logistics: false });
    setAddressDialogOpen(false);
    setEditingAddress(null);
    setLogisticsOpen(false);
    setEditingLogistics(null);
    setErrors({});
  }, [id]);

  useEffect(() => {
    if (!detailQuery.data || !shouldApplyOrderResult(id, detailQuery.data)) {
      return;
    }

    const next = normalizeOrder(detailQuery.data);
    const savedSnapshot = savedStateRef.current;

    setDraft((current) => {
      if (current && savedSnapshot && hasOrderChanged(current, savedSnapshot)) {
        return current;
      }

      return hasOrderChanged(current, next) ? next : current;
    });
    setSavedState((current) => {
      if (!hasOrderChanged(current, next)) {
        return current;
      }

      savedStateRef.current = next;
      return next;
    });
    setErrors((current) => (Object.keys(current).length > 0 ? {} : current));
  }, [detailQuery.data, id]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!draft || !savedState) {
        return;
      }
      if (!hasOrderChanged(draft, savedState)) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [draft, savedState]);

  const totalDirty = useMemo(() => Object.values(dirtySections).some(Boolean), [dirtySections]);
  const filteredItems = useMemo(
    () =>
      draft?.items.filter(
        (item) => !itemKeyword.trim() || containsIgnoreCase(item.product, itemKeyword),
      ) ?? [],
    [draft?.items, itemKeyword],
  );
  const filteredAddresses = useMemo(
    () =>
      draft?.addresses.filter(
        (address) =>
          !addressKeyword.trim() ||
          containsIgnoreCase(
            `${address.receiver} ${address.phone} ${address.province} ${address.city} ${address.address}`,
            addressKeyword,
          ),
      ) ?? [],
    [addressKeyword, draft?.addresses],
  );
  const filteredLogistics = useMemo(
    () =>
      draft?.logistics.filter(
        (item) =>
          !logisticsKeyword.trim() ||
          containsIgnoreCase(
            `${item.company} ${item.trackingNo} ${item.shippingStatus} ${item.note}`,
            logisticsKeyword,
          ),
      ) ?? [],
    [draft?.logistics, logisticsKeyword],
  );

  const navigateWithDirtyGuard = async (
    event: ReactMouseEvent<HTMLButtonElement>,
    targetPath: string,
  ) => {
    if (totalDirty && !(await confirmInApp(t('masterDetail.detail.leaveConfirm')))) {
      event.preventDefault();
      return;
    }

    navigate(targetPath);
  };

  const saveMutation = useMutation({
    mutationFn: saveOrderDetail,
    onSuccess: (saved, submitted) => {
      if (!shouldApplyOrderResult(id, submitted)) {
        return;
      }

      setSavedState(normalizeOrder(saved));
      setDraft(normalizeOrder(saved));
      setDirtySections({ items: false, addresses: false, logistics: false });
      setErrors({});
      toast.success(t('masterDetail.detail.saveSuccess'));
    },
    onError: (_error, submitted) => {
      if (!shouldApplyOrderResult(id, submitted)) {
        return;
      }

      toast.error(t('masterDetail.detail.saveFailed'));
    },
  });

  if (shouldRenderDetailError(draft, detailQuery.isError)) {
    return (
      <div className="rounded-xl border border-[hsl(var(--danger))] px-4 py-3 text-sm text-[hsl(var(--danger))]">
        {detailQuery.error instanceof Error ? detailQuery.error.message : t('errors.serverDescription')}
      </div>
    );
  }

  if (!draft) {
    return <div className="text-sm text-muted-foreground">{t('common.loading')}</div>;
  }

  const markDirty = (section: DirtySectionKey) => {
    setDirtySections((state) => ({ ...state, [section]: true }));
  };

  const validate = () => {
    const nextErrors = buildValidationErrors(draft, t);
    setErrors(nextErrors);
    return nextErrors;
  };

  const handleSaveAll = () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      const firstKey = Object.keys(nextErrors)[0];
      const section = firstKey.startsWith('item')
        ? t('masterDetail.detail.itemsTitle')
        : firstKey.startsWith('addresses')
          ? t('masterDetail.detail.addressesTitle')
          : t('masterDetail.detail.logisticsTitle');
      toast.error(t('masterDetail.detail.checkSectionError', { section }));
      return;
    }
    saveMutation.mutate(draft);
  };

  const cancelAll = async () => {
    if (!savedState) {
      return;
    }
    if (!(await confirmInApp(t('masterDetail.detail.discardConfirm')))) {
      return;
    }
    setDraft(normalizeOrder(savedState));
    setDirtySections({ items: false, addresses: false, logistics: false });
    setErrors({});
  };

  const updateItem = (itemId: string, patch: Partial<OrderItem>) => {
    setDraft((state) =>
      state
        ? {
            ...state,
            items: state.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
          }
        : state,
    );
    markDirty('items');
  };

  const removeItem = (itemId: string) => {
    setDraft((state) =>
      state ? { ...state, items: state.items.filter((item) => item.id !== itemId) } : state,
    );
    markDirty('items');
  };

  const restoreItems = () => {
    if (!savedState) {
      return;
    }
    setDraft((state) => (state ? { ...state, items: normalizeOrder(savedState).items } : state));
    setDirtySections((state) => ({ ...state, items: false }));
  };

  const restoreAddresses = () => {
    if (!savedState) {
      return;
    }
    setDraft((state) =>
      state ? { ...state, addresses: normalizeOrder(savedState).addresses } : state,
    );
    setDirtySections((state) => ({ ...state, addresses: false }));
  };

  const restoreLogistics = () => {
    if (!savedState) {
      return;
    }
    setDraft((state) =>
      state ? { ...state, logistics: normalizeOrder(savedState).logistics } : state,
    );
    setDirtySections((state) => ({ ...state, logistics: false }));
  };

  const saveAddress = () => {
    if (!editingAddress) {
      return;
    }
    if (
      !editingAddress.receiver.trim() ||
      !editingAddress.phone.trim() ||
      !editingAddress.province.trim() ||
      !editingAddress.city.trim() ||
      !editingAddress.address.trim()
    ) {
      toast.error(t('masterDetail.detail.errors.addressRequired'));
      return;
    }
    setDraft((state) => {
      if (!state) {
        return state;
      }
      const exists = state.addresses.some((item) => item.id === editingAddress.id);
      const nextAddresses = exists
        ? state.addresses.map((item) => (item.id === editingAddress.id ? editingAddress : item))
        : [...state.addresses, editingAddress];
      const normalized = nextAddresses.map((item) => ({
        ...item,
        isDefault: editingAddress.isDefault ? item.id === editingAddress.id : item.isDefault,
      }));
      return { ...state, addresses: normalized };
    });
    markDirty('addresses');
    setAddressDialogOpen(false);
  };

  const saveLogistics = () => {
    if (!editingLogistics) {
      return;
    }
    if (!editingLogistics.company.trim()) {
      toast.error(t('masterDetail.detail.errors.companyRequired'));
      return;
    }
    setDraft((state) => {
      if (!state) {
        return state;
      }
      const exists = state.logistics.some((item) => item.id === editingLogistics.id);
      const nextLogistics = exists
        ? state.logistics.map((item) => (item.id === editingLogistics.id ? editingLogistics : item))
        : [...state.logistics, editingLogistics];
      return { ...state, logistics: nextLogistics };
    });
    markDirty('logistics');
    setLogisticsOpen(false);
  };

  const createNewLogistics = () => ({
    id: `log-${Date.now()}`,
    company: '',
    trackingNo: '',
    shippingStatus: 'pending' as const,
    eta: '',
    note: '',
    timeline: [t('masterDetail.detail.newLogisticsTimeline')],
  });

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        handleSaveAll();
      }}
    >
      <PageHeader
        eyebrow={t('masterDetail.detail.eyebrow')}
        title={`${t('masterDetail.detailTitle')} #${draft.orderNo}`}
        description={t('masterDetail.detail.description')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void detailQuery.refetch()}>
              <RefreshCw className="size-4" />
              {t('common.refresh')}
            </Button>
            <Button type="button" variant="outline" onClick={cancelAll}>
              <RotateCcw className="size-4" />
              {t('masterDetail.detail.discardAll')}
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              <Save className="size-4" />
              {saveMutation.isPending ? t('common.saving') : t('masterDetail.detail.saveAll')}
            </Button>
          </div>
        }
      />

      <SummaryCard draft={draft} totalDirty={totalDirty} />

      <FilterToolbar
        itemKeyword={itemKeyword}
        setItemKeyword={setItemKeyword}
        addressKeyword={addressKeyword}
        setAddressKeyword={setAddressKeyword}
        logisticsKeyword={logisticsKeyword}
        setLogisticsKeyword={setLogisticsKeyword}
      />

      <div className="grid gap-4">
        <ItemsSection
          filteredItems={filteredItems}
          dirty={dirtySections.items}
          errors={errors}
          restoreItems={restoreItems}
          setDraft={setDraft}
          markDirty={markDirty}
          updateItem={updateItem}
          removeItem={removeItem}
        />

        <AddressesSection
          draft={draft}
          filteredAddresses={filteredAddresses}
          dirty={dirtySections.addresses}
          errors={errors}
          restoreAddresses={restoreAddresses}
          setEditingAddress={setEditingAddress}
          setAddressDialogOpen={setAddressDialogOpen}
          setDraft={setDraft}
          markDirty={markDirty}
        />

        <LogisticsSection
          filteredLogistics={filteredLogistics}
          dirty={dirtySections.logistics}
          errors={errors}
          restoreLogistics={restoreLogistics}
          setEditingLogistics={setEditingLogistics}
          setLogisticsOpen={setLogisticsOpen}
          setDraft={setDraft}
          markDirty={markDirty}
          createNewLogistics={createNewLogistics}
        />
      </div>

      <AddressDialog
        open={addressDialogOpen}
        onOpenChange={setAddressDialogOpen}
        editingAddress={editingAddress}
        setEditingAddress={setEditingAddress}
        saveAddress={saveAddress}
      />

      <LogisticsDrawer
        open={logisticsOpen}
        onOpenChange={setLogisticsOpen}
        editingLogistics={editingLogistics}
        setEditingLogistics={setEditingLogistics}
        saveLogistics={saveLogistics}
      />

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={(event: ReactMouseEvent<HTMLButtonElement>) =>
            navigateWithDirtyGuard(event, '/data-management/master-detail')
          }
        >
          {t('masterDetail.detail.backToList')}
        </Button>
      </div>
    </form>
  );
}
