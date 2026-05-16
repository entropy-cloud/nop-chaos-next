import { Badge, Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import type { DashboardEvent } from '../../../services/mockApi';

interface EventsCardProps {
  events: DashboardEvent[];
}

export function EventsCard({ events }: EventsCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="theme-card overflow-hidden">
      <CardHeader>
        <div className="eyebrow-text tracking-[0.22em]">{t('dashboard.eventsEyebrow')}</div>
        <CardTitle className="mt-3">{t('dashboard.eventsTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(events ?? []).map((item, index) => (
          <div
            key={item.id}
            className="list-item-animate rounded-xl border border-[hsl(var(--border))] bg-surface-secondary p-4 backdrop-blur-xl"
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
  );
}
