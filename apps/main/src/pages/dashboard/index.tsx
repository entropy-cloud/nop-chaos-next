import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  CalendarRange,
  ChartColumnBig,
  Clock3,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Badge,
  Button,
  Calendar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { MetricCard } from '../../components/common/MetricCard';
import { PageHeader } from '../../components/common/PageHeader';
import { PluginMountPanel } from '../../components/plugin/PluginMountPanel';
import { fetchDashboardData, type DashboardRange } from '../../services/mockApi';

const metricIcons = [Activity, ShieldCheck, Clock3, Users];
const pieColors = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--danger))',
  'hsl(var(--secondary))',
];

function chartTooltipStyle() {
  return {
    borderRadius: 18,
    border: '1px solid hsl(var(--border))',
    background: 'var(--card-surface)',
    boxShadow: 'var(--shadow-md)',
    backdropFilter: 'blur(20px)',
  };
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<DashboardRange>('7d');
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [visibleSeries, setVisibleSeries] = useState({
    requests: true,
    success: true,
    errors: true,
  });
  const [visibleChannels, setVisibleChannels] = useState({
    apiGateway: true,
    scheduler: true,
    portal: true,
    plugin: true,
  });

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

  const filteredTrend = useMemo(() => data?.trend ?? [], [data]);

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
              <SelectTrigger className="min-w-[9.5rem] bg-white/50 backdrop-blur-xl dark:bg-slate-900/40">
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
        <Card className="theme-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <div className="eyebrow-text tracking-[0.22em]">{t('dashboard.trendEyebrow')}</div>
              <CardTitle className="mt-3">{t('dashboard.trendSectionTitle')}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                ['requests', t('dashboard.series.requests')],
                ['success', t('dashboard.series.success')],
                ['errors', t('dashboard.series.errors')],
              ].map(([key, label]) => (
                <button
                  key={key}
                  className={`rounded-full border px-3 py-1.5 text-sm ${visibleSeries[key as keyof typeof visibleSeries] ? 'border-transparent bg-[hsl(var(--primary))] text-white' : 'border-[hsl(var(--border))] text-muted-foreground'}`}
                  onClick={() =>
                    setVisibleSeries((state) => ({
                      ...state,
                      [key]: !state[key as keyof typeof state],
                    }))
                  }
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-[23rem]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredTrend}>
                <defs>
                  <linearGradient id="requestsFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.72} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle()} />
                <Legend />
                {visibleSeries.requests ? (
                  <Area
                    type="monotone"
                    dataKey="requests"
                    name={t('dashboard.series.requests')}
                    stroke="hsl(var(--primary))"
                    fill="url(#requestsFill)"
                    strokeWidth={3}
                  />
                ) : null}
                {visibleSeries.success ? (
                  <Area
                    type="monotone"
                    dataKey="success"
                    name={t('dashboard.series.success')}
                    stroke="hsl(var(--success))"
                    fill="transparent"
                    strokeWidth={2}
                  />
                ) : null}
                {visibleSeries.errors ? (
                  <Area
                    type="monotone"
                    dataKey="errors"
                    name={t('dashboard.series.errors')}
                    stroke="hsl(var(--danger))"
                    fill="transparent"
                    strokeWidth={2}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="theme-card overflow-hidden">
          <CardHeader>
            <div className="eyebrow-text tracking-[0.22em]">{t('dashboard.eventsEyebrow')}</div>
            <CardTitle className="mt-3">{t('dashboard.eventsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.events ?? []).map((item, index) => (
              <div
                key={item.id}
                className="list-item-animate rounded-xl border border-[hsl(var(--border))] bg-white/45 p-4 backdrop-blur-xl dark:bg-slate-900/35"
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">{item.timestamp}</div>
                  <Badge
                    variant={
                      item.type === 'error'
                        ? 'destructive'
                        : item.type === 'success'
                          ? 'success'
                          : 'warning'
                    }
                  >
                    {item.type}
                  </Badge>
                </div>
                <div className="mt-3 text-sm font-medium text-foreground">{item.description}</div>
                <div className="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>{item.scope}</span>
                  <span>{item.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="theme-card overflow-hidden xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <div className="eyebrow-text tracking-[0.22em]">
                {t('dashboard.advancedChartsEyebrow')}
              </div>
              <CardTitle className="mt-3">{t('dashboard.composedChartTitle')}</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ChartColumnBig className="size-4" />
              {t('dashboard.composedChartHint')}
            </div>
          </CardHeader>
          <CardContent className="h-[22rem]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data?.combo ?? []}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  domain={[90, 100]}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle()}
                  formatter={(value, name, item) => {
                    if (name === t('dashboard.successRate')) {
                      return [`${value}%`, name];
                    }

                    if (item.payload.requests) {
                      return [value, name];
                    }

                    return [value, name];
                  }}
                />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="requests"
                  name={t('dashboard.series.requests')}
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={(entry) => Number(((entry.success / entry.requests) * 100).toFixed(1))}
                  name={t('dashboard.successRate')}
                  stroke="hsl(var(--success))"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="theme-card overflow-hidden">
          <CardHeader>
            <div className="eyebrow-text tracking-[0.22em]">{t('dashboard.categoryEyebrow')}</div>
            <CardTitle className="mt-3">{t('dashboard.categoryTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[22rem]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.categories ?? []}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={86}
                  paddingAngle={3}
                >
                  {(data?.categories ?? []).map((entry, index) => (
                    <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle()} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="theme-card overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <div className="eyebrow-text tracking-[0.22em]">
                {t('dashboard.advancedChartsEyebrow')}
              </div>
              <CardTitle className="mt-3">{t('dashboard.channelChartTitle')}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries({
                apiGateway: t('dashboard.channels.apiGateway'),
                scheduler: t('dashboard.channels.scheduler'),
                portal: t('dashboard.channels.portal'),
                plugin: t('dashboard.channels.plugin'),
              }).map(([key, label]) => (
                <button
                  key={key}
                  className={`rounded-full border px-3 py-1.5 text-sm ${visibleChannels[key as keyof typeof visibleChannels] ? 'border-transparent bg-[hsl(var(--primary))] text-white' : 'border-[hsl(var(--border))] text-muted-foreground'}`}
                  onClick={() =>
                    setVisibleChannels((state) => ({
                      ...state,
                      [key]: !state[key as keyof typeof state],
                    }))
                  }
                  type="button"
                >
                  {label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="h-[21rem]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.stacked ?? []}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip contentStyle={chartTooltipStyle()} />
                <Legend />
                {visibleChannels.apiGateway ? (
                  <Bar
                    dataKey="apiGateway"
                    stackId="stack"
                    name={t('dashboard.channels.apiGateway')}
                    fill="hsl(var(--primary))"
                  />
                ) : null}
                {visibleChannels.scheduler ? (
                  <Bar
                    dataKey="scheduler"
                    stackId="stack"
                    name={t('dashboard.channels.scheduler')}
                    fill="hsl(var(--success))"
                  />
                ) : null}
                {visibleChannels.portal ? (
                  <Bar
                    dataKey="portal"
                    stackId="stack"
                    name={t('dashboard.channels.portal')}
                    fill="hsl(var(--warning))"
                  />
                ) : null}
                {visibleChannels.plugin ? (
                  <Bar
                    dataKey="plugin"
                    stackId="stack"
                    name={t('dashboard.channels.plugin')}
                    fill="hsl(var(--secondary))"
                  />
                ) : null}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="theme-card overflow-hidden">
          <CardHeader>
            <div className="eyebrow-text tracking-[0.22em]">
              {t('dashboard.advancedChartsEyebrow')}
            </div>
            <CardTitle className="mt-3">{t('dashboard.radarTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[21rem]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data?.radar ?? []} outerRadius="72%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="metric" />
                <Tooltip contentStyle={chartTooltipStyle()} />
                <Legend />
                <Radar
                  name={t('dashboard.currentPerformance')}
                  dataKey="current"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.28}
                />
                <Radar
                  name={t('dashboard.benchmark')}
                  dataKey="benchmark"
                  stroke="hsl(var(--success))"
                  fill="hsl(var(--success))"
                  fillOpacity={0.14}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <PluginMountPanel />
    </div>
  );
}
