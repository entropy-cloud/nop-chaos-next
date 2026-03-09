import type { ThemeDefinition } from "./types"
import { oceanDepthsTheme } from "./ocean-depths"
import { techInnovationTheme } from "./tech-innovation"
import { forestCanopyTheme } from "./forest-canopy"
import { sunsetBoulevardTheme } from "./sunset-boulevard"
import { modernMinimalistTheme } from "./modern-minimalist"

export const themes: Record<string, ThemeDefinition> = {
  "ocean-depths": oceanDepthsTheme,
  "tech-innovation": techInnovationTheme,
  "forest-canopy": forestCanopyTheme,
  "sunset-boulevard": sunsetBoulevardTheme,
  "modern-minimalist": modernMinimalistTheme,
}

export type ThemeId =
  | "ocean-depths"
  | "tech-innovation"
  | "forest-canopy"
  | "sunset-boulevard"
  | "modern-minimalist"
