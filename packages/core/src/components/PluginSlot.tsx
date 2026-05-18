import { useEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { ErrorBoundary } from './ErrorBoundary';
import { loadRemoteComponent } from '../utils/systemjs';

const PLUGIN_LOAD_TIMEOUT_MS = 10_000;

type PluginSlotState = {
  sourceUrl: string;
  component: ComponentType | null;
  error: string | null;
};

function createPluginLoadTimeout(url: string) {
  return new Error(`Plugin load timed out after ${PLUGIN_LOAD_TIMEOUT_MS}ms: ${url}`);
}

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
  const [state, setState] = useState<PluginSlotState>({
    sourceUrl: url,
    component: null,
    error: null,
  });

  useEffect(() => {
    let active = true;
    let settled = false;
    const requestUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const timeoutId = globalThis.setTimeout(() => {
      if (!active || settled) {
        return;
      }

      settled = true;
      setState({
        sourceUrl: url,
        component: null,
        error: createPluginLoadTimeout(url).message,
      });
    }, PLUGIN_LOAD_TIMEOUT_MS);

    void Promise.resolve(beforeLoad?.())
      .then(() => loadRemoteComponent(requestUrl))
      .then((resolved) => {
        if (active && !settled) {
          settled = true;
          setState({
            sourceUrl: url,
            component: resolved,
            error: null,
          });
        }
      })
      .catch((reason: unknown) => {
        if (active && !settled) {
          settled = true;
          setState({
            sourceUrl: url,
            component: null,
            error: reason instanceof Error ? reason.message : 'Failed to load plugin',
          });
        }
      })
      .finally(() => {
        globalThis.clearTimeout(timeoutId);
      });

    return () => {
      active = false;
      globalThis.clearTimeout(timeoutId);
    };
  }, [beforeLoad, url]);

  if (state.sourceUrl !== url) {
    return <LoadingView />;
  }

  if (state.error) {
    return (
      <Card className="theme-card border-[hsl(var(--danger))]/40" role="alert">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[hsl(var(--danger))]">
            <AlertCircle className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>{state.error}</CardContent>
      </Card>
    );
  }

  if (!state.component) {
    return <LoadingView />;
  }

  const Component = state.component;

  return (
    <ErrorBoundary>
      <Component />
    </ErrorBoundary>
  );
}
