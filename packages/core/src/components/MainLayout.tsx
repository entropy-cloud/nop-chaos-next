import type { ReactNode } from 'react'
import { cn } from '@nop-chaos/ui'

interface MainLayoutProps {
  sidebar: ReactNode
  topBar?: ReactNode
  tabsBar: ReactNode
  mobileSidebar: ReactNode
  children: ReactNode
  mobileSidebarOpen: boolean
  workspaceFullscreen?: boolean
}

export function MainLayout({
  sidebar,
  topBar,
  tabsBar,
  mobileSidebar,
  children,
  mobileSidebarOpen,
  workspaceFullscreen = false
}: MainLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <div className={cn('max-lg:hidden', workspaceFullscreen && 'lg:hidden')}>
        <aside className="fixed inset-y-0 left-0 z-30">{sidebar}</aside>
      </div>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          mobileSidebarOpen && !workspaceFullscreen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        {mobileSidebar}
      </div>
      <div
        className={cn(
          'flex h-screen flex-col',
          workspaceFullscreen ? 'lg:pl-0' : 'lg:pl-[var(--sidebar-width,var(--sidebar-width-expanded,18rem))]'
        )}
      >
        {topBar ? <header className="sticky top-0 z-20">{topBar}</header> : null}
        <div className="sticky top-0 z-10">{tabsBar}</div>
        <main className="flex-1 overflow-auto px-4 pb-6 pt-4 sm:px-6">{children}</main>
      </div>
    </div>
  )
}
