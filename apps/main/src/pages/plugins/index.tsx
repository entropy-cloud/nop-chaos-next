import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/common/PageHeader';
import { PluginMountPanel } from '../../components/plugin/PluginMountPanel';

export default function PluginsHomePage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader title={t('plugins.title')} description={t('plugins.homeDescription')} />
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="theme-card">
          <CardHeader>
            <CardTitle>{t('plugins.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t('plugins.homeCapabilities')}</p>
            <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-surface-secondary p-4 backdrop-blur-xl">
              {t('plugins.homeSupport')}
            </div>
          </CardContent>
        </Card>
        <PluginMountPanel />
      </div>
    </div>
  );
}
