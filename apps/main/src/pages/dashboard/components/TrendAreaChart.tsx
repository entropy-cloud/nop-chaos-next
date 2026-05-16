import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type { DashboardSeriesPoint } from '../../../services/mockApi';
import { chartTooltipStyle } from './chartUtils';

interface TrendAreaChartProps {
  trend: DashboardSeriesPoint[];
}

export function TrendAreaChart({ trend }: TrendAreaChartProps) {
  const { t } = useTranslation();
  const [visibleSeries, setVisibleSeries] = useState({
    requests: true,
    success: true,
    errors: true,
  });

  const filteredTrend = useMemo(() => trend ?? [], [trend]);

  return (
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
  );
}
