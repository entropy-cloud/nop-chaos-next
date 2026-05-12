import { Plus } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type { LogisticsRecord, OrderRecord } from '../../../../../services/mockApi';
import type { ValidationErrors } from '../types';

interface LogisticsSectionProps {
  filteredLogistics: LogisticsRecord[];
  dirty: boolean;
  errors: ValidationErrors;
  restoreLogistics: () => void;
  setEditingLogistics: React.Dispatch<React.SetStateAction<LogisticsRecord | null>>;
  setLogisticsOpen: (open: boolean) => void;
  setDraft: React.Dispatch<React.SetStateAction<OrderRecord | null>>;
  markDirty: (section: 'logistics') => void;
  createNewLogistics: () => LogisticsRecord;
}

export function LogisticsSection({
  filteredLogistics,
  dirty,
  errors,
  restoreLogistics,
  setEditingLogistics,
  setLogisticsOpen,
  setDraft,
  markDirty,
  createNewLogistics,
}: LogisticsSectionProps) {
  const { t } = useTranslation();

  return (
    <Card className="theme-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          {t('masterDetail.detail.logisticsTitle')}
          {dirty ? (
            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[hsl(var(--danger))]" />
          ) : null}
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={restoreLogistics}>
            {t('masterDetail.detail.restoreSection')}
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingLogistics(createNewLogistics());
              setLogisticsOpen(true);
            }}
          >
            <Plus className="size-4" />
            {t('masterDetail.detail.addLogistics')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {filteredLogistics.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">{item.company}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {item.trackingNo || t('masterDetail.detail.noTrackingNo')}{' '}
                  {t('masterDetail.detail.eta', { eta: item.eta || '--' })}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {t(`masterDetail.detail.shippingStatuses.${item.shippingStatus}`)}
                </div>
                {errors[`logistics:${item.id}:trackingNo`] ? (
                  <div className="mt-1 text-sm text-[hsl(var(--danger))]">
                    {errors[`logistics:${item.id}:trackingNo`]}
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingLogistics(item);
                    setLogisticsOpen(true);
                  }}
                >
                  {t('common.edit')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!window.confirm(t('masterDetail.detail.deleteLogisticsConfirm'))) {
                      return;
                    }
                    setDraft((state) =>
                      state
                        ? {
                            ...state,
                            logistics: state.logistics.filter((record) => record.id !== item.id),
                          }
                        : state,
                    );
                    markDirty('logistics');
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
