import type { ReactNode } from 'react'
import { Badge, cn } from '@nop-chaos/ui'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  badge?: string
  actions?: ReactNode
  className?: string
}

function PageHeader({ eyebrow, title, description, badge, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between', className)}>
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <div className="eyebrow-text">{eyebrow}</div> : null}
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">{title}</h1>
          {badge ? <Badge>{badge}</Badge> : null}
        </div>
        {description ? <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export { PageHeader }
export type { PageHeaderProps }
