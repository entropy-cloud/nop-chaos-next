import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ThemeId } from "../themes"
import { themes } from "../themes"

export type ThemeStyle = "default" | "glassmorphism"
export type ThemeMode = "light" | "dark" | "system"

interface ThemeState {
  mode: ThemeMode
  themeId: ThemeId
  style: ThemeStyle

  setMode: (mode: ThemeMode) => void
  setThemeId: (themeId: ThemeId) => void
  setStyle: (style: ThemeStyle) => void
  toggleMode: () => void
  cycleTheme: () => void
}

const getThemeIds = (): ThemeId[] => Object.keys(themes) as ThemeId[]

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: "system",
      themeId: "ocean-depths",
      style: "glassmorphism",

      setMode: (mode) => set({ mode }),
      setThemeId: (themeId) => set({ themeId }),
      setStyle: (style) => set({ style }),

      toggleMode: () => {
        const currentMode = get().mode
        const nextMode: ThemeMode = currentMode === "dark" ? "light" : "dark"
        set({ mode: nextMode })
      },

      cycleTheme: () => {
        const themeIds = getThemeIds()
        const currentIndex = themeIds.indexOf(get().themeId)
        const nextIndex = (currentIndex + 1) % themeIds.length
        set({ themeId: themeIds[nextIndex] })
      },
    }),
    {
      name: "theme-storage",
    }
  )
)
