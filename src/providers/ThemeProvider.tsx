import { useEffect } from "react"
import { useThemeStore } from "@/stores/theme"
import { themes } from "@/themes"

const camelToKebab = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, themeId, style } = useThemeStore()

  useEffect(() => {
    const root = document.documentElement
    const theme = themes[themeId]

    root.classList.remove("light", "dark")
    root.classList.remove("theme-glassmorphism")

    const resolvedMode =
      mode === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : mode

    root.classList.add(resolvedMode)
    root.setAttribute("data-theme", themeId)

    if (style === "glassmorphism") {
      root.classList.add("theme-glassmorphism")
    }

    const colors = theme.colors[resolvedMode]
    for (const [key, value] of Object.entries(colors)) {
      root.style.setProperty(`--${camelToKebab(key)}`, value)
    }

    // ReactFlow CSS variables for theme support
    root.style.setProperty(
      "--xy-node-border-color-default",
      `hsl(${colors.border})`
    )
    root.style.setProperty(
      "--xy-background-pattern-dots-color-default",
      `hsl(${colors.muted})`
    )
    root.style.setProperty(
      "--xy-minimap-background-color-default",
      `hsl(${colors.card})`
    )
    root.style.setProperty(
      "--xy-controls-background-color-default",
      `hsl(${colors.card})`
    )
    root.style.setProperty(
      "--xy-controls-button-background-color-default",
      `hsl(${colors.accent})`
    )
    root.style.setProperty(
      "--xy-controls-button-background-color-hover-default",
      `hsl(${colors.accent})`
    )
  }, [mode, themeId, style])

  return <>{children}</>
}
