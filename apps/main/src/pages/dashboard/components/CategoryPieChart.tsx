import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type { DashboardCategoryPoint } from '../../../services/mockApi';
import { chartTooltipStyle, pieColors } from './chartUtils';

interface CategoryPieChartProps {
  categories: DashboardCategoryPoint[];
}

export function CategoryPieChart({ categories }: CategoryPieChartProps) {
  const { t } = useTranslation();

  return (
    <Card className="theme-card overflow-hidden">
      <CardHeader>
        <div className="eyebrow-text tracking-[0.22em]">{t('dashboard.categoryEyebrow')}</div>
        <CardTitle className="mt-3">{t('dashboard.categoryTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="h-[22rem]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categories ?? []}
              dataKey="value"
              nameKey="name"
              innerRadius={56}
              outerRadius={86}
              paddingAngle={3}
            >
              {(categories ?? []).map((entry, index) => (
                <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={chartTooltipStyle()} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
