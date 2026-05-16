import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createDefaultFluxEnv, createFluxSchemaRenderer } from '@nop-chaos/flux';
import type { FluxSchema } from '@nop-chaos/flux';
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { createMainFluxEnv } from './adapter';
import { fetchFluxPage } from './providers';
import { shouldResetFluxState } from './state';

interface FluxRouteRendererProps {
  schemaPath: string;
  title?: string;
}

const FluxSchemaRenderer = createFluxSchemaRenderer();

export function FluxRouteRenderer({ schemaPath, title }: FluxRouteRendererProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [resolvedSchemaPath, setResolvedSchemaPath] = useState(schemaPath);
  const [schema, setSchema] = useState<FluxSchema | null>(null);
  const [error, setError] = useState<string | null>(null);

  const env = useMemo(
    () =>
      createDefaultFluxEnv({
        ...createMainFluxEnv({
          navigate: (to, options) => {
            if (typeof to === 'number') {
              navigate(to);
              return;
            }

            navigate(to, options);
          },
        }),
      }),
    [navigate],
  );

  const hasStaleState = shouldResetFluxState(resolvedSchemaPath, schemaPath);
  const visibleSchema = hasStaleState ? null : schema;
  const visibleError = hasStaleState ? null : error;

  useEffect(() => {
    const controller = new AbortController();

    void fetchFluxPage(schemaPath, controller.signal)
      .then((value) => {
        setResolvedSchemaPath(schemaPath);
        setSchema(value);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setResolvedSchemaPath(schemaPath);
        setSchema(null);
        setError(reason instanceof Error ? reason.message : t('flux.page.loadFailed'));
      });

    return () => {
      controller.abort(new Error('Flux route renderer unmounted'));
    };
  }, [schemaPath, t]);

  if (visibleError) {
    return (
      <Card className="theme-card border-destructive/40">
        <CardHeader>
          <CardTitle>{title ?? t('flux.page.title')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive">{visibleError}</CardContent>
      </Card>
    );
  }

  if (!visibleSchema) {
    return (
      <Card className="theme-card">
        <CardHeader>
          <CardTitle>{title ?? t('flux.page.title')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t('common.loading')}</CardContent>
      </Card>
    );
  }

  return <FluxSchemaRenderer schema={visibleSchema} schemaUrl={schemaPath} env={env} />;
}
