import { Button, Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../components/common/PageHeader';
import { getThemeRegistry } from '../../../config/themeRegistry';
import { useTheme } from '../../../hooks/useTheme';

export default function SettingsThemePage() {
  const { t } = useTranslation();
  const { themeConfig, setDisplayMode, setThemeId } = useTheme();
  const themes = getThemeRegistry();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('common.preferences')}
        title={t('settings.themeTitle')}
        description={t('settings.themeDescription')}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="theme-card">
          <CardHeader>
            <CardTitle>{t('settings.visualTheme')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {themes.map((theme) => {
              const active = themeConfig.themeId === theme.id;

              return (
                <button
                  key={theme.id}
                  className={`rounded-lg border p-4 text-left transition ${active ? 'border-transparent bg-[color-mix(in_hsl,hsl(var(--primary))_12%,transparent)] text-foreground shadow-sm' : 'border-[hsl(var(--border))] bg-surface-secondary text-foreground hover:border-[hsl(var(--primary))]'}`}
                  onClick={() => setThemeId(theme.id)}
                  type="button"
                >
                  <div className="font-medium">{t(theme.labelKey)}</div>
                  {theme.descriptionKey ? (
                    <div className="meta-text mt-2">{t(theme.descriptionKey)}</div>
                  ) : null}
                </button>
              );
            })}
          </CardContent>
        </Card>
        <Card className="theme-card">
          <CardHeader>
            <CardTitle>{t('settings.displayMode')}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            {(['light', 'dark', 'system'] as const).map((mode) => (
              <Button
                key={mode}
                variant={themeConfig.displayMode === mode ? 'default' : 'secondary'}
                onClick={() => setDisplayMode(mode)}
              >
                {t(`common.displayModes.${mode}`)}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
