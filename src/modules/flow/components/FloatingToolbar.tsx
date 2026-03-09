import { useEffect, useState, memo } from "react"
import { createPortal } from "react-dom"
import { Trash2, Copy, Settings, Move } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"

interface FloatingToolbarProps {
  x: number
  y: number
  visible: boolean
  onDelete?: () => void
  onCopy?: () => void
  onSettings?: () => void
  type: "node" | "edge"
}

export const FloatingToolbar = memo(
  ({
    x,
    y,
    visible,
    onDelete,
    onCopy,
    onSettings,
    type,
  }: FloatingToolbarProps) => {
    const { t } = useTranslation()
    const [position, setPosition] = useState({ x, y })

    useEffect(() => {
      setPosition({ x, y })
    }, [x, y])

    if (!visible) return null

    return createPortal(
      <div
        className={cn(
          "fixed z-50 flex items-center gap-1 px-2 py-1.5 rounded-lg shadow-lg",
          "bg-popover border border-border",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
        style={{
          left: position.x,
          top: position.y - 50,
          transform: "translateX(-50%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {type === "node" && onCopy && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-accent"
            onClick={onCopy}
            title={t("flow.tooltip.copy")}
          >
            <Copy className="h-4 w-4 text-primary" />
          </Button>
        )}

        {onSettings && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-accent"
            onClick={onSettings}
            title={t("flow.tooltip.settings")}
          >
            <Settings className="h-4 w-4 text-primary" />
          </Button>
        )}

        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-destructive/10"
            onClick={onDelete}
            title={t("flow.tooltip.delete")}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}

        <div className="flex items-center justify-center w-6 h-6 ml-1 cursor-move opacity-40 hover:opacity-100">
          <Move className="h-3 w-3 text-muted-foreground" />
        </div>
      </div>,
      document.body
    )
  }
)

FloatingToolbar.displayName = "FloatingToolbar"
