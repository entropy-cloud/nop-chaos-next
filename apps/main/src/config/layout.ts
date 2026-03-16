const DEFAULT_SIDEBAR_WIDTH_REM = 18
const DEFAULT_SIDEBAR_COLLAPSED_WIDTH_REM = 5

function parseSidebarWidth(value: string | undefined, fallback: number) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

export const layoutConfig = {
  sidebarWidthRem: parseSidebarWidth(import.meta.env.VITE_SIDEBAR_WIDTH, DEFAULT_SIDEBAR_WIDTH_REM),
  sidebarCollapsedWidthRem: parseSidebarWidth(import.meta.env.VITE_SIDEBAR_COLLAPSED_WIDTH, DEFAULT_SIDEBAR_COLLAPSED_WIDTH_REM)
}

export function toRem(value: number) {
  return `${value}rem`
}
