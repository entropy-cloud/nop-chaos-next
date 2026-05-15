import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@nop-chaos/ui';

interface MainLayoutProps {
  sidebar: ReactNode;
  topBar?: ReactNode;
  tabsBar: ReactNode;
  mobileSidebar: ReactNode;
  children: ReactNode;
  mobileSidebarOpen: boolean;
  onCloseMobileSidebar?: () => void;
  workspaceFullscreen?: boolean;
}

export function MainLayout({
  sidebar,
  topBar,
  tabsBar,
  mobileSidebar,
  children,
  mobileSidebarOpen,
  onCloseMobileSidebar,
  workspaceFullscreen = false,
}: MainLayoutProps) {
  const { t } = useTranslation();

  const handleOverlayKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onCloseMobileSidebar?.();
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <a
        className="sr-only absolute left-4 top-4 z-50 rounded-md bg-background px-3 py-2 text-sm text-foreground shadow-md focus:not-sr-only focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href="#main-content"
      >
        {t('core.layout.skipToMainContent')}
      </a>
      <div className={cn('max-lg:hidden', workspaceFullscreen && 'lg:hidden')}>
        <aside className="fixed inset-y-0 left-0 z-30">{sidebar}</aside>
      </div>
      <div
        aria-hidden={!mobileSidebarOpen || workspaceFullscreen}
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          mobileSidebarOpen && !workspaceFullscreen
            ? 'opacity-100'
            : 'pointer-events-none opacity-0',
        )}
        onClick={() => onCloseMobileSidebar?.()}
        role="presentation"
      >
        <div
          onClick={(event) => event.stopPropagation()}
          onKeyDown={handleOverlayKeyDown}
          role="presentation"
          tabIndex={-1}
        >
          {mobileSidebar}
        </div>
      </div>
      <div
        className={cn(
          'flex h-screen flex-col',
          workspaceFullscreen
            ? 'lg:pl-0'
            : 'lg:pl-[var(--sidebar-width,var(--sidebar-width-expanded,18rem))]',
        )}
      >
        {topBar ? <header className="sticky top-0 z-20">{topBar}</header> : null}
        <div className="sticky top-0 z-10">{tabsBar}</div>
        <main className="flex-1 overflow-auto px-4 pb-6 pt-4 sm:px-6" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
