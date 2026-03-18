import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { RefreshCw, RotateCcw, Save } from 'lucide-react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Input,
  toast
} from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../../../components/common/PageHeader'
import { fetchOrderDetail, saveOrderDetail, type AddressRecord, type LogisticsRecord, type OrderItem, type OrderRecord } from '../../../../services/mockApi'
import { AddressDialog } from './components/AddressDialog'
import { AddressesSection } from './components/AddressesSection'
import { FilterToolbar } from './components/FilterToolbar'
import { ItemsSection } from './components/ItemsSection'
import { LogisticsDrawer } from './components/LogisticsDrawer'
import { LogisticsSection } from './components/LogisticsSection'
import { SummaryCard } from './components/SummaryCard'
import type { DirtySectionKey, DirtySections, ValidationErrors } from './types'
import { buildValidationErrors, containsIgnoreCase, normalizeOrder } from './utils'

export default function MasterDetailDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const detailQuery = useQuery({ queryKey: ['order-detail', id], queryFn: () => fetchOrderDetail(id) })
  const [draft, setDraft] = useState<OrderRecord | null>(null)
  const [savedState, setSavedState] = useState<OrderRecord | null>(null)
  const [dirtySections, setDirtySections] = useState<DirtySections>({ items: false, addresses: false, logistics: false })
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(null)
  const [logisticsOpen, setLogisticsOpen] = useState(false)
  const [editingLogistics, setEditingLogistics] = useState<LogisticsRecord | null>(null)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [itemKeyword, setItemKeyword] = useState('')
  const [addressKeyword, setAddressKeyword] = useState('')
  const [logisticsKeyword, setLogisticsKeyword] = useState('')

  useEffect(() => {
    if (!detailQuery.data) {
      return
    }
    const next = normalizeOrder(detailQuery.data)
    setDraft(next)
    setSavedState(normalizeOrder(detailQuery.data))
    setDirtySections({ items: false, addresses: false, logistics: false })
    setErrors({})
  }, [detailQuery.data])

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!draft || !savedState) {
        return
      }
      if (JSON.stringify(draft) === JSON.stringify(savedState)) {
        return
      }
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [draft, savedState])

  const totalDirty = useMemo(() => Object.values(dirtySections).some(Boolean), [dirtySections])
  const filteredItems = useMemo(
    () => draft?.items.filter((item) => !itemKeyword.trim() || containsIgnoreCase(item.product, itemKeyword)) ?? [],
    [draft?.items, itemKeyword]
  )
  const filteredAddresses = useMemo(
    () =>
      draft?.addresses.filter(
        (address) =>
          !addressKeyword.trim() ||
          containsIgnoreCase(`${address.receiver} ${address.phone} ${address.province} ${address.city} ${address.address}`, addressKeyword)
      ) ?? [],
    [addressKeyword, draft?.addresses]
  )
  const filteredLogistics = useMemo(
    () =>
      draft?.logistics.filter(
        (item) => !logisticsKeyword.trim() || containsIgnoreCase(`${item.company} ${item.trackingNo} ${item.shippingStatus} ${item.note}`, logisticsKeyword)
      ) ?? [],
    [draft?.logistics, logisticsKeyword]
  )

  const navigateWithDirtyGuard = (event: ReactMouseEvent<HTMLButtonElement>, targetPath: string) => {
    if (totalDirty && !window.confirm(t('masterDetail.detail.leaveConfirm'))) {
      event.preventDefault()
      return
    }

    navigate(targetPath)
  }

  const saveMutation = useMutation({
    mutationFn: saveOrderDetail,
    onSuccess: (saved) => {
      setSavedState(normalizeOrder(saved))
      setDraft(normalizeOrder(saved))
      setDirtySections({ items: false, addresses: false, logistics: false })
      setErrors({})
      toast.success(t('masterDetail.detail.saveSuccess'))
    },
    onError: () => {
      toast.error(t('masterDetail.detail.saveFailed'))
    }
  })

  if (!draft) {
    return null
  }

  const markDirty = (section: DirtySectionKey) => {
    setDirtySections((state) => ({ ...state, [section]: true }))
  }

  const validate = () => {
    const nextErrors = buildValidationErrors(draft, t)
    setErrors(nextErrors)
    return nextErrors
  }

  const handleSaveAll = async () => {
    const nextErrors = validate()
    if (Object.keys(nextErrors).length > 0) {
      const firstKey = Object.keys(nextErrors)[0]
      const section = firstKey.startsWith('item')
        ? t('masterDetail.detail.itemsTitle')
        : firstKey.startsWith('addresses')
          ? t('masterDetail.detail.addressesTitle')
          : t('masterDetail.detail.logisticsTitle')
      toast.error(t('masterDetail.detail.checkSectionError', { section }))
      return
    }
    await saveMutation.mutateAsync(draft)
  }

  const cancelAll = () => {
    if (!savedState) {
      return
    }
    if (!window.confirm(t('masterDetail.detail.discardConfirm'))) {
      return
    }
    setDraft(normalizeOrder(savedState))
    setDirtySections({ items: false, addresses: false, logistics: false })
    setErrors({})
  }

  const updateItem = (itemId: string, patch: Partial<OrderItem>) => {
    setDraft((state) =>
      state
        ? {
            ...state,
            items: state.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item))
          }
        : state
    )
    markDirty('items')
  }

  const removeItem = (itemId: string) => {
    setDraft((state) => (state ? { ...state, items: state.items.filter((item) => item.id !== itemId) } : state))
    markDirty('items')
  }

  const restoreItems = () => {
    if (!savedState) {
      return
    }
    setDraft((state) => (state ? { ...state, items: normalizeOrder(savedState).items } : state))
    setDirtySections((state) => ({ ...state, items: false }))
  }

  const restoreAddresses = () => {
    if (!savedState) {
      return
    }
    setDraft((state) => (state ? { ...state, addresses: normalizeOrder(savedState).addresses } : state))
    setDirtySections((state) => ({ ...state, addresses: false }))
  }

  const restoreLogistics = () => {
    if (!savedState) {
      return
    }
    setDraft((state) => (state ? { ...state, logistics: normalizeOrder(savedState).logistics } : state))
    setDirtySections((state) => ({ ...state, logistics: false }))
  }

  const saveAddress = () => {
    if (!editingAddress) {
      return
    }
    if (!editingAddress.receiver.trim() || !editingAddress.phone.trim() || !editingAddress.province.trim() || !editingAddress.city.trim() || !editingAddress.address.trim()) {
      toast.error(t('masterDetail.detail.errors.addressRequired'))
      return
    }
    setDraft((state) => {
      if (!state) {
        return state
      }
      const exists = state.addresses.some((item) => item.id === editingAddress.id)
      const nextAddresses = exists
        ? state.addresses.map((item) => (item.id === editingAddress.id ? editingAddress : item))
        : [...state.addresses, editingAddress]
      const normalized = nextAddresses.map((item) => ({ ...item, isDefault: editingAddress.isDefault ? item.id === editingAddress.id : item.isDefault }))
      return { ...state, addresses: normalized }
    })
    markDirty('addresses')
    setAddressDialogOpen(false)
  }

  const saveLogistics = () => {
    if (!editingLogistics) {
      return
    }
    if (!editingLogistics.company.trim()) {
      toast.error(t('masterDetail.detail.errors.companyRequired'))
      return
    }
    setDraft((state) => {
      if (!state) {
        return state
      }
      const exists = state.logistics.some((item) => item.id === editingLogistics.id)
      const nextLogistics = exists
        ? state.logistics.map((item) => (item.id === editingLogistics.id ? editingLogistics : item))
        : [...state.logistics, editingLogistics]
      return { ...state, logistics: nextLogistics }
    })
    markDirty('logistics')
    setLogisticsOpen(false)
  }

  const createNewLogistics = () => ({
    id: `log-${Date.now()}`,
    company: '',
    trackingNo: '',
    shippingStatus: 'pending' as const,
    eta: '',
    note: '',
    timeline: [t('masterDetail.detail.newLogisticsTimeline')]
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('masterDetail.detail.eyebrow')}
        title={`${t('masterDetail.detailTitle')} #${draft.orderNo}`}
        description={t('masterDetail.detail.description')}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void detailQuery.refetch()}>
              <RefreshCw className="size-4" />
              {t('common.refresh')}
            </Button>
            <Button variant="outline" onClick={cancelAll}>
              <RotateCcw className="size-4" />
              {t('masterDetail.detail.discardAll')}
            </Button>
            <Button onClick={() => void handleSaveAll()}>
              <Save className="size-4" />
              {t('masterDetail.detail.saveAll')}
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
        <Button variant="outline" onClick={(event) => navigateWithDirtyGuard(event, '/data-management/master-detail')}>
          {t('masterDetail.detail.backToList')}
        </Button>
      </div>
    </div>
  )
}
