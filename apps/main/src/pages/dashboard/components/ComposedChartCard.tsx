import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { ChartColumnBig } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DashboardSeriesPoint } from '../../../services/mockApi';
import { chartInitialDimension, chartTooltipStyle } from './chartUtils';

interface ComposedChartCardProps {
  combo: DashboardSeriesPoint[];
}

export function ComposedChartCard({ combo }: ComposedChartCardProps) {
  const { t } = useTranslation();

  return (
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
        <ResponsiveContainer width="100%" height="100%" initialDimension={chartInitialDimension}>
          <ComposedChart data={combo ?? []}>
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
  );
}
