import { Search } from 'lucide-react';
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type { MasterDetailFiltersState, StatusFilter } from '../listTypes';

interface MasterDetailFiltersProps {
  filters: MasterDetailFiltersState;
  showMore: boolean;
  setKeyword: (value: string) => void;
  setStatus: (value: StatusFilter) => void;
  setChannel: (value: string) => void;
  setOwner: (value: string) => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  setPage: (value: number) => void;
  onReset: () => void;
  onToggleAdvanced: () => void;
}

export function MasterDetailFilters({
  filters,
  showMore,
  setKeyword,
  setStatus,
  setChannel,
  setOwner,
  setDateFrom,
  setDateTo,
  setPage,
  onReset,
  onToggleAdvanced,
}: MasterDetailFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 xl:flex-nowrap">
        <div className="flex min-w-[15rem] flex-1 items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-surface px-3">
          <Search className="size-4 text-muted-foreground" />
          <Input
            className="h-9 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
            placeholder={t('masterDetail.searchPlaceholder')}
            value={filters.keyword}
            onChange={(event) => setKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                setPage(1);
              }
            }}
          />
        </div>
        <Select
          value={filters.status}
          onValueChange={(value) => {
            if (value) {
              setStatus(value as StatusFilter);
            }
          }}
        >
          <SelectTrigger className="h-9 w-[9rem] bg-surface">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('masterDetail.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('common.orderStatuses.active')}</SelectItem>
            <SelectItem value="review">{t('common.orderStatuses.review')}</SelectItem>
            <SelectItem value="draft">{t('common.orderStatuses.draft')}</SelectItem>
            <SelectItem value="closed">{t('common.orderStatuses.closed')}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex min-w-[17rem] items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-surface-secondary px-3 py-1.5">
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="h-8 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          <span className="text-sm text-muted-foreground">{t('masterDetail.to')}</span>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="h-8 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setPage(1)}>
            {t('masterDetail.query')}
          </Button>
          <Button size="sm" variant="outline" onClick={onReset}>
            {t('common.reset')}
          </Button>
          <Button size="sm" variant={showMore ? 'secondary' : 'ghost'} onClick={onToggleAdvanced}>
            {showMore ? t('masterDetail.collapse') : t('masterDetail.advanced')}
          </Button>
        </div>
      </div>
      {showMore ? (
        <div className="grid gap-2 rounded-xl border border-dashed border-[hsl(var(--border))] bg-surface-ghost p-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_1.1fr]">
          <Input
            placeholder={t('masterDetail.channelPlaceholder')}
            value={filters.channel}
            onChange={(event) => setChannel(event.target.value)}
            className="bg-surface"
          />
          <Input
            placeholder={t('masterDetail.ownerPlaceholder')}
            value={filters.owner}
            onChange={(event) => setOwner(event.target.value)}
            className="bg-surface"
          />
          <div className="flex items-center rounded-xl bg-surface-secondary px-3 py-2 text-sm text-muted-foreground">
            {t('masterDetail.advancedHint')}
          </div>
        </div>
      ) : null}
    </div>
  );
}
