import {
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type { LogisticsRecord } from '../../../../../services/mockApi';

interface LogisticsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLogistics: LogisticsRecord | null;
  setEditingLogistics: React.Dispatch<React.SetStateAction<LogisticsRecord | null>>;
  saveLogistics: () => void;
}

export function LogisticsDrawer({
  open,
  onOpenChange,
  editingLogistics,
  setEditingLogistics,
  saveLogistics,
}: LogisticsDrawerProps) {
  const { t } = useTranslation();

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right" modal={false}>
      <DrawerContent className="h-screen max-w-[32rem] overflow-y-auto border-l border-[hsl(var(--border))] bg-background shadow-xl">
        <DrawerHeader>
          <DrawerTitle>{t('masterDetail.detail.logisticsDrawerTitle')}</DrawerTitle>
          <DrawerDescription>
            {t('masterDetail.detail.logisticsDrawerDescription')}
          </DrawerDescription>
        </DrawerHeader>
        {editingLogistics ? (
          <DrawerBody>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label>{t('masterDetail.detail.logisticsFields.company')}</Label>
                <Input
                  value={editingLogistics.company}
                  onChange={(event) =>
                    setEditingLogistics({ ...editingLogistics, company: event.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('masterDetail.detail.logisticsFields.trackingNo')}</Label>
                <Input
                  value={editingLogistics.trackingNo}
                  onChange={(event) =>
                    setEditingLogistics({ ...editingLogistics, trackingNo: event.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('masterDetail.detail.logisticsFields.shippingStatus')}</Label>
                <Select
                  value={editingLogistics.shippingStatus}
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }

                    setEditingLogistics({
                      ...editingLogistics,
                      shippingStatus: value as LogisticsRecord['shippingStatus'],
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">
                      {t('masterDetail.detail.shippingStatuses.pending')}
                    </SelectItem>
                    <SelectItem value="shipping">
                      {t('masterDetail.detail.shippingStatuses.shipping')}
                    </SelectItem>
                    <SelectItem value="delivered">
                      {t('masterDetail.detail.shippingStatuses.delivered')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('masterDetail.detail.logisticsFields.eta')}</Label>
                <Input
                  type="date"
                  value={editingLogistics.eta}
                  onChange={(event) =>
                    setEditingLogistics({ ...editingLogistics, eta: event.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('masterDetail.detail.logisticsFields.note')}</Label>
                <Textarea
                  value={editingLogistics.note}
                  onChange={(event) =>
                    setEditingLogistics({ ...editingLogistics, note: event.target.value })
                  }
                />
              </div>
              <div className="rounded-lg border border-dashed border-[hsl(var(--border))] bg-white/35 p-4 text-sm text-muted-foreground dark:bg-slate-900/20">
                <div className="font-medium text-foreground">
                  {t('masterDetail.detail.logisticsTimeline')}
                </div>
                <div className="mt-3 space-y-2">
                  {editingLogistics.timeline.map((item) => (
                    <div key={item}>{item}</div>
                  ))}
                </div>
              </div>
            </div>
          </DrawerBody>
        ) : null}
        <DrawerFooter className="border-t bg-muted/50 pt-4 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={saveLogistics}>{t('masterDetail.detail.saveLogistics')}</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
