import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Clock3, Gauge, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import {
  Button,
  Calendar,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nop-chaos/ui';
import { CalendarRange } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MetricCard } from '../../components/common/MetricCard';
import { PageHeader } from '../../components/common/PageHeader';
import { PluginMountPanel } from '../../components/plugin/PluginMountPanel';
import { fetchDashboardData, type DashboardRange } from '../../services/mockApi';
import { TrendAreaChart } from './components/TrendAreaChart';
import { EventsCard } from './components/EventsCard';
import { ComposedChartCard } from './components/ComposedChartCard';
import { CategoryPieChart } from './components/CategoryPieChart';
import { ChannelStackedChart } from './components/ChannelStackedChart';
import { PerformanceRadarChart } from './components/PerformanceRadarChart';

const metricIcons = [Activity, ShieldCheck, Clock3, Users];

export default function DashboardPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<DashboardRange>('7d');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', range, customStart?.toISOString(), customEnd?.toISOString()],
    queryFn: () =>
      fetchDashboardData(
        range,
        customStart ? customStart.toISOString().slice(0, 10) : undefined,
        customEnd ? customEnd.toISOString().slice(0, 10) : undefined,
      ),
  });

  const data = dashboardQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
        title={t('dashboard.title')}
        description={t('dashboard.overviewDescription')}
        badge={t('dashboard.liveBadge')}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={range}
              onValueChange={(value) => {
                if (value) {
                  setRange(value as DashboardRange);
                }
              }}
            >
              <SelectTrigger className="min-w-[9.5rem] bg-surface backdrop-blur-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t('common.rangeOptions.today')}</SelectItem>
                <SelectItem value="7d">{t('common.rangeOptions.last7Days')}</SelectItem>
                <SelectItem value="30d">{t('common.rangeOptions.last30Days')}</SelectItem>
                <SelectItem value="custom">{t('common.rangeOptions.custom')}</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger render={<Button size="sm" variant="outline" />}>
                <CalendarRange className="size-4" />
                {range === 'custom' ? t('common.selectRange') : t('common.quickDates')}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <div className="grid gap-3 p-3 text-sm">
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setRange('today')}>
                      {t('common.rangeOptions.today')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRange('7d')}>
                      {t('common.rangeOptions.last7Days')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRange('30d')}>
                      {t('common.rangeOptions.last30Days')}
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      {t('common.startDate')}
                    </div>
                    <Calendar
                      mode="single"
                      selected={customStart}
                      onSelect={(value: Date | undefined) => {
                        setRange('custom');
                        setCustomStart(value);
                      }}
                    />
                    <div className="text-sm font-medium text-muted-foreground">
                      {t('common.endDate')}
                    </div>
                    <Calendar
                      mode="single"
                      selected={customEnd}
                      onSelect={(value: Date | undefined) => {
                        setRange('custom');
                        setCustomEnd(value);
                      }}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button size="sm" variant="outline" onClick={() => void dashboardQuery.refetch()}>
              <RefreshCw className="size-4" />
              {t('common.refresh')}
            </Button>
          </div>
        }
      />

      {dashboardQuery.isLoading ? <div className="text-sm text-muted-foreground">{t('common.loading')}</div> : null}
      {dashboardQuery.isError ? (
        <div className="rounded-xl border border-[hsl(var(--danger))] px-4 py-3 text-sm text-[hsl(var(--danger))]">
          {dashboardQuery.error instanceof Error ? dashboardQuery.error.message : t('errors.serverDescription')}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(data?.metrics ?? []).map((metric, index) => {
          const Icon = metricIcons[index] ?? Gauge;
          return (
            <MetricCard
              key={metric.id}
              label={metric.label}
              value={metric.value}
              trend={metric.trend}
              comparison={metric.comparison}
              positive={metric.positive}
              icon={<Icon className="size-5" />}
            />
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <TrendAreaChart trend={data?.trend ?? []} />
        <EventsCard events={data?.events ?? []} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ComposedChartCard combo={data?.combo ?? []} />
        <CategoryPieChart categories={data?.categories ?? []} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <ChannelStackedChart stacked={data?.stacked ?? []} />
        <PerformanceRadarChart radar={data?.radar ?? []} />
      </div>

      <PluginMountPanel />
    </div>
  );
}
