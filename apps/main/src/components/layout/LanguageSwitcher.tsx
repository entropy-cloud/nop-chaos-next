import { Languages } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nop-chaos/ui'
import { getLanguageOptions } from '../../config/i18n/languages'

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation()
  const languageOptions = getLanguageOptions()

  return (
    <div className="hidden items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[var(--card-surface)] px-3 py-1.5 backdrop-blur-xl sm:flex">
      <Languages className="size-4 text-muted-foreground" />
      <Select value={i18n.language} onValueChange={(value) => void i18n.changeLanguage(value ?? undefined)}>
        <SelectTrigger
          size="sm"
          className="h-8 w-[10rem] border-none bg-transparent px-0 pr-7 shadow-none focus:ring-0 focus-visible:ring-0"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languageOptions.map((item) => (
            <SelectItem key={item.code} value={item.code}>
              {t(item.labelKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
