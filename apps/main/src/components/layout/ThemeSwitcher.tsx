import { MonitorCog, MoonStar, Palette, SunMedium } from 'lucide-react'
import { Button } from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import { getNextThemeId, getThemeDefinition } from '../../config/themeRegistry'
import { useTheme } from '../../hooks/useTheme'

const modes = [
  { value: 'light', icon: SunMedium },
  { value: 'dark', icon: MoonStar },
  { value: 'system', icon: MonitorCog }
] as const

export function ThemeSwitcher() {
  const { t } = useTranslation()
  const { themeConfig, setDisplayMode, setThemeId } = useTheme()
  const nextThemeId = getNextThemeId(themeConfig.themeId)
  const nextTheme = getThemeDefinition(nextThemeId)

  return (
    <div className="flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[var(--card-surface)] p-1 backdrop-blur-xl">
      <Button variant="ghost" size="icon" onClick={() => setThemeId(nextThemeId)} title={nextTheme ? t(nextTheme.labelKey) : t('settings.visualTheme')}>
        <Palette className="size-4" />
      </Button>
      {modes.map((mode) => {
        const Icon = mode.icon
        const active = themeConfig.displayMode === mode.value
        return (
          <Button
            key={mode.value}
            variant="ghost"
            size="icon"
            className={active ? 'bg-[color-mix(in_hsl,hsl(var(--primary))_12%,transparent)] text-[hsl(var(--primary-dark))]' : ''}
            onClick={() => setDisplayMode(mode.value)}
            title={t(`common.displayModes.${mode.value}`)}
          >
            <Icon className="size-4" />
          </Button>
        )
      })}
    </div>
  )
}
