import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../components/common/PageHeader';
import { useLayoutStore } from '../../../store/layoutStore';

export default function SettingsLayoutPage() {
  const { t } = useTranslation();
  const sidebarCollapsed = useLayoutStore((state) => state.sidebarCollapsed);
  const sidebarWidthRem = useLayoutStore((state) => state.sidebarWidthRem);
  const sidebarCollapsedWidthRem = useLayoutStore((state) => state.sidebarCollapsedWidthRem);
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar);
  const setSidebarWidthRem = useLayoutStore((state) => state.setSidebarWidthRem);
  const setSidebarCollapsedWidthRem = useLayoutStore((state) => state.setSidebarCollapsedWidthRem);
  const resetSidebarWidths = useLayoutStore((state) => state.resetSidebarWidths);
  const applyNumberInput = (value: string, commit: (next: number) => void) => {
    if (!value.trim()) {
      return;
    }

    const next = Number(value);
    if (!Number.isNaN(next)) {
      commit(next);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('common.preferences')}
        title={t('settings.layoutTitle')}
        description={t('settings.layoutDescription')}
      />
      <Card className="theme-card max-w-xl">
        <CardHeader>
          <CardTitle>{t('settings.sidebarMode')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {sidebarCollapsed ? t('settings.sidebarCollapsed') : t('settings.sidebarExpanded')}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2.5 text-sm">
              <Label>{t('settings.sidebarWidth')}</Label>
              <Input
                min={14}
                max={28}
                step={1}
                type="number"
                value={sidebarWidthRem}
                onChange={(event) => applyNumberInput(event.target.value, setSidebarWidthRem)}
              />
            </div>
            <div className="grid gap-2.5 text-sm">
              <Label>{t('settings.sidebarCollapsedWidth')}</Label>
              <Input
                min={4}
                max={8}
                step={0.5}
                type="number"
                value={sidebarCollapsedWidthRem}
                onChange={(event) =>
                  applyNumberInput(event.target.value, setSidebarCollapsedWidthRem)
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={toggleSidebar}>{t('settings.toggleSidebar')}</Button>
            <Button variant="outline" onClick={resetSidebarWidths}>
              {t('settings.resetSidebarWidth')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
