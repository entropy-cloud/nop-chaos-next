import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../components/common/PageHeader';
import { getLanguageOptions } from '../../../config/i18n/languages';

export default function SettingsLanguagePage() {
  const { t, i18n } = useTranslation();
  const languageOptions = getLanguageOptions();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('common.preferences')}
        title={t('settings.languageTitle')}
        description={t('settings.languageDescription')}
      />
      <Card className="theme-card max-w-xl">
        <CardHeader>
          <CardTitle>{t('settings.activeLanguage')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={i18n.language}
            onValueChange={(value) => void i18n.changeLanguage(value ?? undefined)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languageOptions.map((item) => (
                <SelectItem key={item.code} value={item.code}>
                  {t(item.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </div>
  );
}
