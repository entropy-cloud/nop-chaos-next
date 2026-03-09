import { Button } from "./button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog"
import { useThemeStore, type ThemeStyle, type ThemeMode } from "@/stores/theme"
import { themes, type ThemeId } from "@/themes"
import { Check, Palette, Monitor, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

export function ThemeSelector() {
  const { mode, themeId, style, setMode, setThemeId, setStyle } =
    useThemeStore()
  const { t } = useTranslation()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" data-testid="theme-toggle">
          <Palette className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("theme.title")}</DialogTitle>
          <DialogDescription>{t("theme.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">
              {t("theme.displayMode")}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <ModeOption mode="light" current={mode} onChange={setMode}>
                <Sun className="h-5 w-5 mb-2" />
                <span className="text-sm font-medium">{t("theme.light")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("theme.lightDesc")}
                </span>
              </ModeOption>
              <ModeOption mode="dark" current={mode} onChange={setMode}>
                <Moon className="h-5 w-5 mb-2" />
                <span className="text-sm font-medium">{t("theme.dark")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("theme.darkDesc")}
                </span>
              </ModeOption>
              <ModeOption mode="system" current={mode} onChange={setMode}>
                <Monitor className="h-5 w-5 mb-2" />
                <span className="text-sm font-medium">{t("theme.system")}</span>
                <span className="text-xs text-muted-foreground">
                  {t("theme.systemDesc")}
                </span>
              </ModeOption>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">
              {t("theme.colorTheme")}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(Object.keys(themes) as ThemeId[]).map((id) => {
                const theme = themes[id]
                const isSelected = themeId === id
                return (
                  <button
                    key={id}
                    onClick={() => setThemeId(id)}
                    className={cn(
                      "relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all hover:border-primary/50",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    {isSelected && (
                      <Check className="absolute top-2 right-2 h-4 w-4 text-primary" />
                    )}
                    <div
                      className="h-12 w-12 rounded-full mb-2 shadow-sm"
                      style={{ backgroundColor: theme.colors.light.primary }}
                    />
                    <span className="text-sm font-medium">{theme.name}</span>
                    <span className="text-xs text-muted-foreground text-center line-clamp-2">
                      {theme.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3">
              {t("theme.visualStyle")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <StyleOption style="default" current={style} onChange={setStyle}>
                <div className="h-8 w-8 rounded border-2 border-border bg-background" />
                <span className="text-sm font-medium">
                  {t("theme.default")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("theme.defaultDesc")}
                </span>
              </StyleOption>
              <StyleOption
                style="glassmorphism"
                current={style}
                onChange={setStyle}
              >
                <div className="h-8 w-8 rounded border-2 border-border bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm" />
                <span className="text-sm font-medium">
                  {t("theme.glassmorphism")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t("theme.glassmorphismDesc")}
                </span>
              </StyleOption>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ModeOptionProps {
  mode: ThemeMode
  current: ThemeMode
  onChange: (mode: ThemeMode) => void
  children: React.ReactNode
}

function ModeOption({ mode, current, onChange, children }: ModeOptionProps) {
  return (
    <button
      onClick={() => onChange(mode)}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all",
        current === mode
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-accent"
      )}
    >
      {children}
    </button>
  )
}

interface StyleOptionProps {
  style: ThemeStyle
  current: ThemeStyle
  onChange: (style: ThemeStyle) => void
  children: React.ReactNode
}

function StyleOption({ style, current, onChange, children }: StyleOptionProps) {
  return (
    <button
      onClick={() => onChange(style)}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all",
        current === style
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50 hover:bg-accent"
      )}
    >
      {children}
    </button>
  )
}
