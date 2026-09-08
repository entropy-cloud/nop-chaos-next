import { Suspense, useMemo } from 'react';
import type { MenuItem } from '@nop-chaos/shared';
import { ErrorBoundary, usePermissionGuard } from '@nop-chaos/core';
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { ForbiddenPage, ServerErrorPage, getBuiltinPage } from './pageRegistry';
import { AmisRouteEntry } from './AmisRouteEntry';
import { FluxRouteEntry } from './FluxRouteEntry';

const IFRAME_SANDBOX_ALLOWLIST = 'allow-scripts allow-same-origin allow-forms allow-popups';

interface RouteRendererProps {
  item: MenuItem;
}

// RouteRenderer is the route-level permission guard (layer 2 of the two-layer model).
// Layer 1 (menu filtering) already hides unauthorized items from the sidebar, but this
// guard ensures that direct URL navigation to a restricted route still results in a
// ForbiddenPage rather than silently rendering protected content.
export function RouteRenderer({ item }: RouteRendererProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const allowed = usePermissionGuard(user?.roles ?? [], item.roles);
  const title = item.title ?? t('common.loading');
  const Page = useMemo(() => getBuiltinPage(item.componentId), [item.componentId]);

  const loadingView = (
    <Card className="theme-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{t('common.loading')}</CardContent>
    </Card>
  );

  const content = (() => {
    if (!allowed) {
      // ForbiddenPage is shown when the route render guard denies access.
      // This is the safety net for direct URL navigation to restricted routes.
      return <ForbiddenPage />;
    }

    if (item.pageType === 'amis' && item.schemaPath) {
      return (
        <Suspense fallback={loadingView}>
          <AmisRouteEntry schemaPath={item.schemaPath} title={title} />
        </Suspense>
      );
    }

    if (item.pageType === 'flux' && item.schemaPath) {
      return (
        <Suspense fallback={loadingView}>
          <FluxRouteEntry schemaPath={item.schemaPath} title={title} />
        </Suspense>
      );
    }

    if (item.pageType === 'iframe' && item.frameSrc) {
      return (
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[var(--card-surface)] shadow-md">
          <iframe
            className="h-[calc(100vh-11rem)] w-full"
            sandbox={IFRAME_SANDBOX_ALLOWLIST}
            src={item.frameSrc}
            title={title}
          />
        </div>
      );
    }

    if (item.pageType === 'external' && item.externalUrl) {
      return (
        <Card className="theme-card">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div>{item.externalUrl}</div>
            <a
              className="text-[hsl(var(--primary))] underline-offset-4 hover:underline"
              href={item.externalUrl}
              rel="noreferrer"
              target="_blank"
            >
              {t('common.viewDetails')}
            </a>
          </CardContent>
        </Card>
      );
    }

    if (!Page) {
      return <ServerErrorPage />;
    }

    return (
      <Suspense fallback={loadingView}>
        <Page />
      </Suspense>
    );
  })();

  return <ErrorBoundary>{content}</ErrorBoundary>;
}
