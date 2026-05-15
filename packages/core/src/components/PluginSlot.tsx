import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './ErrorBoundary';
import { loadRemoteComponent } from '../utils/systemjs';

interface PluginSlotProps {
  beforeLoad?: () => Promise<void> | void;
  url: string;
  title: string;
}

function LoadingView() {
  const { t } = useTranslation();
  return (
    <Card aria-busy="true" className="theme-card" role="status">
      <CardHeader>
        <CardTitle>{t('core.plugin.loading')}</CardTitle>
      </CardHeader>
      <CardContent aria-live="polite">{t('core.plugin.preparing')}</CardContent>
    </Card>
  );
}

export function PluginSlot({ beforeLoad, url, title }: PluginSlotProps) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const requestUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;

    void Promise.resolve(beforeLoad?.())
      .then(() => loadRemoteComponent(requestUrl))
      .then((resolved) => {
        if (active) {
          setComponent(() => resolved);
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Failed to load plugin');
        }
      });

    return () => {
      active = false;
    };
  }, [beforeLoad, url]);

  if (error) {
    return (
      <Card className="theme-card border-[hsl(var(--danger))]/40" role="alert">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[hsl(var(--danger))]">
            <AlertCircle className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{error}</CardContent>
      </Card>
    );
  }

  if (!Component) {
    return <LoadingView />;
  }

  return (
    <ErrorBoundary>
      <Component />
    </ErrorBoundary>
  );
}
