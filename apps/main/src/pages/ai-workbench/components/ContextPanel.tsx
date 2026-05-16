import { Badge, Card, CardContent, CardHeader, CardTitle, Switch } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { assistantCatalog } from '../../../services/mockApi';
import { getAssistantDescription, getAssistantName } from '../utils';

interface ContextPanelProps {
  contextEnabled: boolean;
  setContextEnabled: (value: boolean) => void;
  contextSummary: string;
}

export function ContextPanel({
  contextEnabled,
  setContextEnabled,
  contextSummary,
}: ContextPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col bg-[color-mix(in_hsl,hsl(var(--primary))_4%,transparent)]/40 p-5">
      <Card className="theme-card shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-lg">
            <span>{t('aiWorkbench.contextAttachment')}</span>
            <Switch
              checked={contextEnabled}
              onCheckedChange={setContextEnabled}
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-xl border border-[hsl(var(--border))] bg-surface-secondary p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium text-foreground">{t('aiWorkbench.contextStatus')}</div>
              <Badge variant={contextEnabled ? 'success' : 'outline'}>
                {contextEnabled
                  ? t('aiWorkbench.contextEnabled')
                  : t('aiWorkbench.contextDisabled')}
              </Badge>
            </div>
            <p className="mt-3 leading-6">{t('aiWorkbench.contextStatusDescription')}</p>
          </div>
          <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-surface-secondary p-4">
            <div className="eyebrow-text">{t('aiWorkbench.contextPreview')}</div>
            <div className="mt-3 leading-6">{contextSummary}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="theme-card mt-4 shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">{t('aiWorkbench.assistantGuide')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {assistantCatalog.map((assistant) => (
            <div
              key={assistant.id}
              className="rounded-lg border border-[hsl(var(--border))] bg-surface-secondary p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-foreground">{getAssistantName(t, assistant)}</div>
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: assistant.color }}
                />
              </div>
              <p className="mt-2 leading-6">{getAssistantDescription(t, assistant)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
