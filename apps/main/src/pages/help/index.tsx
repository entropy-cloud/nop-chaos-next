import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '../../components/common/PageHeader'

export default function HelpHomePage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <PageHeader title={t('help.title')} description={t('help.placeholder')} />
      <Card className="theme-card">
        <CardHeader>
          <CardTitle>{t('help.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t('help.placeholder')}</p>
        </CardContent>
      </Card>
    </div>
  )
}
