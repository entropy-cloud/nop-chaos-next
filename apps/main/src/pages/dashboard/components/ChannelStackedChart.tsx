import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type { DashboardChannelPoint } from '../../../services/mockApi';
import { chartInitialDimension, chartTooltipStyle } from './chartUtils';

interface ChannelStackedChartProps {
  stacked: DashboardChannelPoint[];
}

export function ChannelStackedChart({ stacked }: ChannelStackedChartProps) {
  const { t } = useTranslation();
  const [visibleChannels, setVisibleChannels] = useState({
    apiGateway: true,
    scheduler: true,
    portal: true,
    plugin: true,
  });

  return (
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
        <ResponsiveContainer width="100%" height="100%" initialDimension={chartInitialDimension}>
          <BarChart data={stacked ?? []}>
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
  );
}
