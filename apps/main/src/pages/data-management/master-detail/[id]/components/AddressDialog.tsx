import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Switch, Textarea } from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import type { AddressRecord } from '../../../../../services/mockApi'

interface AddressDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingAddress: AddressRecord | null
  setEditingAddress: React.Dispatch<React.SetStateAction<AddressRecord | null>>
  saveAddress: () => void
}

export function AddressDialog({ open, onOpenChange, editingAddress, setEditingAddress, saveAddress }: AddressDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              <Switch checked={editingAddress.isDefault} onChange={(e) => setEditingAddress({ ...editingAddress, isDefault: e.target.checked })} />
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={saveAddress}>{t('masterDetail.detail.saveAddress')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
