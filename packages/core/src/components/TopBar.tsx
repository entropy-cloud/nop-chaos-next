import type { ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { Button } from '@nop-chaos/ui'

export interface BreadcrumbItem {
  label: string
  path?: string
}

interface TopBarProps {
  breadcrumbs: BreadcrumbItem[]
  onToggleSidebar: () => void
  actions: ReactNode
}

export function TopBar({ breadcrumbs, onToggleSidebar, actions }: TopBarProps) {
  return (
    <div className="border-b border-[hsl(var(--border))] bg-[var(--app-topbar-bg)]/90 backdrop-blur-2xl">
      <div className="flex h-[4.25rem] items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onToggleSidebar}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden min-w-0 items-center gap-2 text-sm text-[hsl(var(--gray-500))] md:flex">
            {breadcrumbs.map((crumb, index) => (
              <div key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-2">
                {index > 0 ? <span>/</span> : null}
                <span className={index === breadcrumbs.length - 1 ? 'truncate font-medium text-foreground' : 'truncate'}>
                  {crumb.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
    </div>
  )
}
