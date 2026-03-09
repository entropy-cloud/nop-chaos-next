import { useTranslation } from "react-i18next"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { supportedLanguages, type LanguageCode } from "@/i18n"
import { cn } from "@/lib/utils"

export function LanguageSelector() {
  const { i18n } = useTranslation()

  const currentLang = supportedLanguages.find((l) => l.code === i18n.language)

  const handleLanguageChange = (langCode: LanguageCode) => {
    i18n.changeLanguage(langCode)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <span className="text-lg">{currentLang?.flag ?? "🌐"}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={cn(
              "focus:bg-primary/10 focus:text-primary",
              i18n.language === lang.code && "bg-primary/10 text-primary"
            )}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
