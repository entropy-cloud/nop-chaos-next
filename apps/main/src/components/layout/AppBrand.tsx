import { Orbit } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface AppBrandProps {
  compact?: boolean
}

export function AppBrand({ compact = false }: AppBrandProps) {
  const { t } = useTranslation()

  return (
    <div className={compact ? 'flex items-center justify-center' : 'flex items-center gap-3'}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--secondary)))] text-white shadow-primary-md">
        <Orbit className="size-5" />
      </div>
      {compact ? null : (
        <div className="min-w-0">
          <div className="eyebrow-text">Nop Chaos</div>
          <div className="truncate text-base font-semibold text-foreground">{t('common.operationsConsole')}</div>
        </div>
      )}
    </div>
  )
}
