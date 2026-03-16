import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus, RefreshCw, RotateCcw, Save, Trash2 } from 'lucide-react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  toast
} from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../../../components/common/PageHeader'
import { fetchOrderDetail, saveOrderDetail, type AddressRecord, type LogisticsRecord, type OrderItem, type OrderRecord } from '../../../../services/mockApi'

function calculateSubtotal(item: OrderItem) {
  return item.quantity * item.price
}

function normalizeOrder(order: OrderRecord): OrderRecord {
  return structuredClone(order)
}

function containsIgnoreCase(value: string, keyword: string) {
  return value.toLowerCase().includes(keyword.trim().toLowerCase())
}

export default function MasterDetailDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const detailQuery = useQuery({ queryKey: ['order-detail', id], queryFn: () => fetchOrderDetail(id) })
  const [draft, setDraft] = useState<OrderRecord | null>(null)
  const [savedState, setSavedState] = useState<OrderRecord | null>(null)
  const [dirtySections, setDirtySections] = useState<Record<'items' | 'addresses' | 'logistics', boolean>>({ items: false, addresses: false, logistics: false })
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [editingAddress, setEditingAddress] = useState<AddressRecord | null>(null)
  const [logisticsOpen, setLogisticsOpen] = useState(false)
  const [editingLogistics, setEditingLogistics] = useState<LogisticsRecord | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
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

  const markDirty = (section: keyof typeof dirtySections) => {
    setDirtySections((state) => ({ ...state, [section]: true }))
  }

  const validate = () => {
    const nextErrors: Record<string, string> = {}
    draft.items.forEach((item) => {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        nextErrors[`item:${item.id}:quantity`] = t('masterDetail.detail.errors.quantityPositiveInteger')
      }
      if (!(item.price > 0)) {
        nextErrors[`item:${item.id}:price`] = t('masterDetail.detail.errors.pricePositive')
      }
    })

    if (draft.addresses.filter((item) => item.isDefault).length !== 1) {
      nextErrors['addresses:default'] = t('masterDetail.detail.errors.singleDefaultAddress')
    }

    draft.logistics.forEach((item) => {
      if (item.shippingStatus !== 'pending' && !item.trackingNo.trim()) {
        nextErrors[`logistics:${item.id}:trackingNo`] = t('masterDetail.detail.errors.trackingRequired')
      }
    })

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

        <Card className="theme-card">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>{t('masterDetail.detail.summaryTitle')}</CardTitle>
            <Badge variant={totalDirty ? 'warning' : 'success'}>{totalDirty ? t('masterDetail.detail.unsavedChanges') : t('masterDetail.detail.synced')}</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-lg border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/30">
              <div className="text-sm text-muted-foreground">{t('masterDetail.columns.orderNo')}</div>
              <div className="mt-2 font-semibold text-foreground">{draft.orderNo}</div>
          </div>
          <div className="rounded-lg border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/30">
            <div className="text-sm text-muted-foreground">{t('masterDetail.columns.customerName')}</div>
            <div className="mt-2 font-semibold text-foreground">{draft.customerName}</div>
          </div>
          <div className="rounded-lg border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/30">
            <div className="text-sm text-muted-foreground">{t('masterDetail.detail.orderStatus')}</div>
            <div className="mt-2 font-semibold text-foreground">{t(`common.orderStatuses.${draft.status}`)}</div>
          </div>
            <div className="rounded-lg border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/30">
              <div className="text-sm text-muted-foreground">{t('masterDetail.columns.createdAt')}</div>
              <div className="mt-2 font-semibold text-foreground">{draft.createdAt}</div>
            </div>
            <div className="rounded-lg border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/30">
              <div className="text-sm text-muted-foreground">{t('masterDetail.detail.ownerChannel')}</div>
              <div className="mt-2 font-semibold text-foreground">{draft.owner}</div>
              <div className="mt-1 text-sm text-muted-foreground">{draft.channel}</div>
            </div>
          </CardContent>
        </Card>

      <div className="flex flex-wrap items-center gap-3 xl:flex-nowrap">
        <Input className="min-w-[15rem] flex-1 bg-white/55 dark:bg-slate-900/35" placeholder={t('masterDetail.detail.itemFilter')} value={itemKeyword} onChange={(event) => setItemKeyword(event.target.value)} />
        <Input className="min-w-[15rem] flex-1 bg-white/55 dark:bg-slate-900/35" placeholder={t('masterDetail.detail.addressFilter')} value={addressKeyword} onChange={(event) => setAddressKeyword(event.target.value)} />
        <Input className="min-w-[15rem] flex-1 bg-white/55 dark:bg-slate-900/35" placeholder={t('masterDetail.detail.logisticsFilter')} value={logisticsKeyword} onChange={(event) => setLogisticsKeyword(event.target.value)} />
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setItemKeyword('')
              setAddressKeyword('')
              setLogisticsKeyword('')
            }}
          >
            {t('masterDetail.detail.clearFilters')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        <Card className="theme-card">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              {t('masterDetail.detail.itemsTitle')}
              {dirtySections.items ? <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--danger))]" /> : null}
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
                          items: [...state.items, { id: `item-${Date.now()}`, product: t('masterDetail.detail.newProduct'), quantity: 1, price: 0 }]
                        }
                      : state
                  )
                  markDirty('items')
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
                    const quantityError = errors[`item:${item.id}:quantity`]
                    const priceError = errors[`item:${item.id}:price`]
                    return (
                      <TableRow key={item.id} className={dirtySections.items ? 'bg-[color-mix(in_hsl,hsl(var(--warning))_6%,transparent)]' : ''}>
                        <TableCell>
                          <Input value={item.product} onChange={(event) => updateItem(item.id, { product: event.target.value })} />
                          {!item.product.trim() ? <div className="mt-1 text-sm text-[hsl(var(--danger))]">{t('masterDetail.detail.errors.productRequired')}</div> : null}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) })}
                            className={quantityError ? 'border-[hsl(var(--danger))]' : ''}
                          />
                          {quantityError ? <div className="mt-1 text-sm text-[hsl(var(--danger))]">{quantityError}</div> : null}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(event) => updateItem(item.id, { price: Number(event.target.value) })}
                            className={priceError ? 'border-[hsl(var(--danger))]' : ''}
                          />
                          {priceError ? <div className="mt-1 text-sm text-[hsl(var(--danger))]">{priceError}</div> : null}
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
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="theme-card">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              {t('masterDetail.detail.addressesTitle')}
              {dirtySections.addresses ? <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--danger))]" /> : null}
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={restoreAddresses}>
                {t('masterDetail.detail.restoreSection')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingAddress({ id: `addr-${Date.now()}`, receiver: '', phone: '', province: '', city: '', address: '', isDefault: draft.addresses.length === 0 })
                  setAddressDialogOpen(true)
                }}
              >
                <Plus className="size-4" />
                {t('masterDetail.detail.addAddress')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {errors['addresses:default'] ? <div className="rounded-xl border border-[hsl(var(--danger))] bg-[hsl(var(--danger-bg))] px-3 py-2 text-sm text-[hsl(var(--danger))]">{errors['addresses:default']}</div> : null}
            {filteredAddresses.map((address) => (
              <div key={address.id} className="rounded-xl border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/30">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-foreground">{address.receiver}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{address.province} {address.city} {address.address}</div>
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
                                addresses: state.addresses.map((item) => ({ ...item, isDefault: checked ? item.id === address.id : item.isDefault && item.id !== address.id }))
                              }
                            : state
                        )
                        markDirty('addresses')
                      }}
                    />
                    <Button size="sm" variant="outline" onClick={() => { setEditingAddress(address); setAddressDialogOpen(true) }}>
                      {t('common.edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!window.confirm(t('masterDetail.detail.deleteAddressConfirm'))) {
                          return
                        }
                        setDraft((state) => (state ? { ...state, addresses: state.addresses.filter((item) => item.id !== address.id) } : state))
                        markDirty('addresses')
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

        <Card className="theme-card">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              {t('masterDetail.detail.logisticsTitle')}
              {dirtySections.logistics ? <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--danger))]" /> : null}
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={restoreLogistics}>
                {t('masterDetail.detail.restoreSection')}
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setEditingLogistics({ id: `log-${Date.now()}`, company: '', trackingNo: '', shippingStatus: 'pending', eta: '', note: '', timeline: [t('masterDetail.detail.newLogisticsTimeline')] })
                  setLogisticsOpen(true)
                }}
              >
                <Plus className="size-4" />
                {t('masterDetail.detail.addLogistics')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredLogistics.map((item) => (
              <div key={item.id} className="rounded-xl border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/30">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-foreground">{item.company}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{item.trackingNo || t('masterDetail.detail.noTrackingNo')} · ETA {item.eta || '--'}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{t(`masterDetail.detail.shippingStatuses.${item.shippingStatus}`)}</div>
                    {errors[`logistics:${item.id}:trackingNo`] ? <div className="mt-1 text-sm text-[hsl(var(--danger))]">{errors[`logistics:${item.id}:trackingNo`]}</div> : null}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setEditingLogistics(item); setLogisticsOpen(true) }}>
                      {t('common.edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!window.confirm(t('masterDetail.detail.deleteLogisticsConfirm'))) {
                          return
                        }
                        setDraft((state) => (state ? { ...state, logistics: state.logistics.filter((record) => record.id !== item.id) } : state))
                        markDirty('logistics')
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
      </div>

      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddress?.id ? t('masterDetail.detail.editAddress') : t('masterDetail.detail.addAddress')}</DialogTitle>
            <DialogDescription>{t('masterDetail.detail.addressDialogDescription')}</DialogDescription>
          </DialogHeader>
          {editingAddress ? (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>{t('masterDetail.detail.addressFields.receiver')}</Label>
                <Input value={editingAddress.receiver} onChange={(event) => setEditingAddress({ ...editingAddress, receiver: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>{t('masterDetail.detail.addressFields.phone')}</Label>
                <Input value={editingAddress.phone} onChange={(event) => setEditingAddress({ ...editingAddress, phone: event.target.value })} />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t('masterDetail.detail.addressFields.province')}</Label>
                  <Input value={editingAddress.province} onChange={(event) => setEditingAddress({ ...editingAddress, province: event.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>{t('masterDetail.detail.addressFields.city')}</Label>
                  <Input value={editingAddress.city} onChange={(event) => setEditingAddress({ ...editingAddress, city: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{t('masterDetail.detail.addressFields.address')}</Label>
                <Textarea value={editingAddress.address} onChange={(event) => setEditingAddress({ ...editingAddress, address: event.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] px-3 py-2">
                <span className="text-sm text-muted-foreground">{t('masterDetail.detail.addressFields.default')}</span>
                <Switch checked={editingAddress.isDefault} onCheckedChange={(checked) => setEditingAddress({ ...editingAddress, isDefault: checked })} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddressDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveAddress}>{t('masterDetail.detail.saveAddress')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={logisticsOpen} onOpenChange={setLogisticsOpen} direction="right">
        <DrawerContent className="h-screen max-w-[32rem] border-l border-[hsl(var(--border))] bg-background shadow-xl">
          <DrawerHeader>
            <DrawerTitle>{t('masterDetail.detail.logisticsDrawerTitle')}</DrawerTitle>
            <DrawerDescription>{t('masterDetail.detail.logisticsDrawerDescription')}</DrawerDescription>
          </DrawerHeader>
          {editingLogistics ? (
            <div className="space-y-4 px-4">
              <div className="grid gap-2">
                <Label>{t('masterDetail.detail.logisticsFields.company')}</Label>
                <Input value={editingLogistics.company} onChange={(event) => setEditingLogistics({ ...editingLogistics, company: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>{t('masterDetail.detail.logisticsFields.trackingNo')}</Label>
                <Input value={editingLogistics.trackingNo} onChange={(event) => setEditingLogistics({ ...editingLogistics, trackingNo: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>{t('masterDetail.detail.logisticsFields.shippingStatus')}</Label>
                <Input value={editingLogistics.shippingStatus} onChange={(event) => setEditingLogistics({ ...editingLogistics, shippingStatus: event.target.value as LogisticsRecord['shippingStatus'] })} />
              </div>
              <div className="grid gap-2">
                <Label>{t('masterDetail.detail.logisticsFields.eta')}</Label>
                <Input type="date" value={editingLogistics.eta} onChange={(event) => setEditingLogistics({ ...editingLogistics, eta: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>{t('masterDetail.detail.logisticsFields.note')}</Label>
                <Textarea value={editingLogistics.note} onChange={(event) => setEditingLogistics({ ...editingLogistics, note: event.target.value })} />
              </div>
              <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-white/35 p-4 text-sm text-muted-foreground dark:bg-slate-900/20">
                <div className="font-medium text-foreground">{t('masterDetail.detail.logisticsTimeline')}</div>
                <div className="mt-3 space-y-2">
                  {editingLogistics.timeline.map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
          <DrawerFooter>
            <Button variant="outline" onClick={() => setLogisticsOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={saveLogistics}>{t('masterDetail.detail.saveLogistics')}</Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <div className="flex justify-end">
        <Button variant="outline" onClick={(event) => navigateWithDirtyGuard(event, '/data-management/master-detail')}>
          {t('masterDetail.detail.backToList')}
        </Button>
      </div>
    </div>
  )
}
