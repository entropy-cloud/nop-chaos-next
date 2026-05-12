import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../components/common/page-header';

export default function HelpGuidePage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PageHeader title={t('help.guideTitle')} description={t('help.guideDescription')} />
      <Card className="theme-card">
        <CardHeader>
          <CardTitle>{t('help.guideTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t('help.guideDescription')}</p>
          <p>{t('help.guideBody')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
