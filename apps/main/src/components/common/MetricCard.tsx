import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'

interface MetricCardProps {
  label: string
  value: string
  trend: string
  comparison?: string
  positive?: boolean
  icon: ReactNode
}

export function MetricCard({ label, value, trend, comparison, positive = true, icon }: MetricCardProps) {
  const { t } = useTranslation()

  return (
    <Card className="theme-card overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <div className="text-sm font-medium text-muted-foreground">{label}</div>
          <CardTitle className="mt-3 text-3xl">{value}</CardTitle>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_hsl,hsl(var(--primary))_10%,transparent)] text-[hsl(var(--primary-dark))]">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-sm">
        <span className={positive ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--danger))]'}>
          {positive ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
        </span>
        <span className={positive ? 'text-[hsl(var(--success))]' : 'text-[hsl(var(--danger))]'}>{trend}</span>
        <span className="text-muted-foreground">{comparison ?? t('common.vsLastWeek')}</span>
      </CardContent>
    </Card>
  )
}
