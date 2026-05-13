import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createDefaultFluxEnv, createFluxSchemaRenderer } from '@nop-chaos/flux';
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { createMainFluxEnv } from './adapter';
import { fetchFluxPage } from './providers';
import type { FluxSchema } from '@nop-chaos/flux';

interface FluxRouteRendererProps {
  schemaPath: string;
  title?: string;
}

const FluxSchemaRenderer = createFluxSchemaRenderer();

export function FluxRouteRenderer({ schemaPath, title }: FluxRouteRendererProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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

  useEffect(() => {
    let active = true;

    void fetchFluxPage(schemaPath)
      .then((value) => {
        if (!active) {
          return;
        }

        setSchema(value as FluxSchema);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (!active) {
          return;
        }

        setSchema(null);
        setError(reason instanceof Error ? reason.message : 'Failed to load flux schema');
      });

    return () => {
      active = false;
    };
  }, [schemaPath]);

  if (error) {
    return (
      <Card className="theme-card border-destructive/40">
        <CardHeader>
          <CardTitle>{title ?? t('flux.page.title')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }

  if (!schema) {
    return (
      <Card className="theme-card">
        <CardHeader>
          <CardTitle>{title ?? t('flux.page.title')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t('common.loading')}</CardContent>
      </Card>
    );
  }

  return <FluxSchemaRenderer schema={schema} schemaUrl={schemaPath} env={env} />;
}
