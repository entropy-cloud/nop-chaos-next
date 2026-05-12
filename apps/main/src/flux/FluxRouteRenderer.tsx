import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';

interface FluxRouteRendererProps {
  schemaPath: string;
  title?: string;
}

export function FluxRouteRenderer({ schemaPath, title }: FluxRouteRendererProps) {
  const { t } = useTranslation();
  return (
    <Card className="theme-card">
      <CardHeader>
        <CardTitle>{title ?? t('flux.page.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          <p>{t('flux.schemaPath', { path: schemaPath })}</p>
          <p className="mt-2">{t('flux.comingSoon')}</p>
          <p className="mt-2">{t('flux.seeMigrationPlan')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
