import { Badge, Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type { OrderRecord } from '../../../../../services/mockApi';

interface SummaryCardProps {
  draft: OrderRecord;
  totalDirty: boolean;
}

export function SummaryCard({ draft, totalDirty }: SummaryCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="theme-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{t('masterDetail.detail.summaryTitle')}</CardTitle>
        <Badge variant={totalDirty ? 'warning' : 'success'}>
          {totalDirty ? t('masterDetail.detail.unsavedChanges') : t('masterDetail.detail.synced')}
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg border border-[hsl(var(--border))] bg-surface-secondary p-4">
          <div className="text-sm text-muted-foreground">{t('masterDetail.columns.orderNo')}</div>
          <div className="mt-2 font-semibold text-foreground">{draft.orderNo}</div>
        </div>
        <div className="rounded-lg border border-[hsl(var(--border))] bg-surface-secondary p-4">
          <div className="text-sm text-muted-foreground">
            {t('masterDetail.columns.customerName')}
          </div>
          <div className="mt-2 font-semibold text-foreground">{draft.customerName}</div>
        </div>
        <div className="rounded-lg border border-[hsl(var(--border))] bg-surface-secondary p-4">
          <div className="text-sm text-muted-foreground">
            {t('masterDetail.detail.orderStatus')}
          </div>
          <div className="mt-2 font-semibold text-foreground">
            {t(`common.orderStatuses.${draft.status}`)}
          </div>
        </div>
        <div className="rounded-lg border border-[hsl(var(--border))] bg-surface-secondary p-4">
          <div className="text-sm text-muted-foreground">{t('masterDetail.columns.createdAt')}</div>
          <div className="mt-2 font-semibold text-foreground">{draft.createdAt}</div>
        </div>
        <div className="rounded-lg border border-[hsl(var(--border))] bg-surface-secondary p-4">
          <div className="text-sm text-muted-foreground">
            {t('masterDetail.detail.ownerChannel')}
          </div>
          <div className="mt-2 font-semibold text-foreground">{draft.owner}</div>
          <div className="mt-1 text-sm text-muted-foreground">{draft.channel}</div>
        </div>
      </CardContent>
    </Card>
  );
}
