import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { fetchFluxPage } from './providers';
import type { FluxDemoSchema } from './testSchema';

interface FluxRouteRendererProps {
  schemaPath: string;
  title?: string;
}

export function FluxRouteRenderer({ schemaPath, title }: FluxRouteRendererProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [schema, setSchema] = useState<FluxDemoSchema | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void fetchFluxPage(schemaPath)
      .then((value) => {
        if (!active) {
          return;
        }

        setSchema(value as FluxDemoSchema);
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

  return (
    <div className="space-y-6">
      <Card className="theme-card overflow-hidden">
        <CardHeader className="space-y-3">
          <div className="text-xs font-medium uppercase tracking-[0.24em] text-[hsl(var(--primary))]">
            {schema.eyebrow}
          </div>
          <CardTitle>{title ?? schema.title ?? t('flux.page.title')}</CardTitle>
          <p className="max-w-3xl text-sm text-muted-foreground">{schema.summary}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {schema.stats.map((stat) => (
              <div
                key={stat.id}
                className="rounded-2xl border border-[hsl(var(--border))] bg-background/70 p-4 shadow-sm"
              >
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.label}
                </div>
                <div className="mt-2 text-base font-semibold text-foreground">{stat.value}</div>
                <div className="mt-2 text-sm text-muted-foreground">{stat.hint}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-background/60 p-4 text-sm text-muted-foreground">
            {t('flux.schemaPath', { path: schema.schemaPath })}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {schema.sections.map((section) => (
              <div
                key={section.id}
                className="rounded-3xl border border-[hsl(var(--border))] bg-background/75 p-5 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
                <ul className="mt-4 space-y-3 text-sm text-foreground">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="rounded-xl bg-[hsl(var(--muted))]/55 px-3 py-2">
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {schema.actions.map((action) => (
              <Button
                key={action.id}
                onClick={() => navigate(action.href)}
                variant={action.variant === 'secondary' ? 'outline' : 'default'}
              >
                {action.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
