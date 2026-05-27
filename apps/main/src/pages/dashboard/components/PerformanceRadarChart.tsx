import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type { DashboardRadarPoint } from '../../../services/mockApi';
import { chartInitialDimension, chartTooltipStyle } from './chartUtils';

interface PerformanceRadarChartProps {
  radar: DashboardRadarPoint[];
}

export function PerformanceRadarChart({ radar }: PerformanceRadarChartProps) {
  const { t } = useTranslation();

  return (
    <Card className="theme-card overflow-hidden">
      <CardHeader>
        <div className="eyebrow-text tracking-[0.22em]">
          {t('dashboard.advancedChartsEyebrow')}
        </div>
        <CardTitle className="mt-3">{t('dashboard.radarTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="h-[21rem]">
        <ResponsiveContainer width="100%" height="100%" initialDimension={chartInitialDimension}>
          <RadarChart data={radar ?? []} outerRadius="72%">
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
  );
}
