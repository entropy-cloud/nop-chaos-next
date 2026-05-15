import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface TopBarProps {
  breadcrumbs: BreadcrumbItem[];
  onToggleSidebar: () => void;
  actions: ReactNode;
}

export function TopBar({ breadcrumbs, onToggleSidebar, actions }: TopBarProps) {
  const { t } = useTranslation();

  return (
    <div className="border-b border-[hsl(var(--border))] bg-[var(--app-topbar-bg)]/90 backdrop-blur-2xl">
      <div className="flex h-[4.25rem] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            aria-label={t('layout.expandSidebar')}
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onToggleSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden min-w-0 items-center gap-2 text-sm text-[hsl(var(--gray-500))] md:flex">
            {breadcrumbs.map((crumb, index) => (
              // eslint-disable-next-line react/no-array-index-key -- breadcrumbs are static, not reordered
              <div key={`breadcrumb-${index}`} className="flex min-w-0 items-center gap-2">
                {index > 0 ? <span>/</span> : null}
                <span
                  aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
                  className={
                    index === breadcrumbs.length - 1
                      ? 'truncate font-medium text-foreground'
                      : 'truncate'
                  }
                >
                  {crumb.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}
