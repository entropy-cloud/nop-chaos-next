import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useTabStore } from "@/stores/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export function TabBar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tabs, activeKey, setActiveKey, removeTab } = useTabStore()

  const handleTabClick = (key: string, path: string) => {
    setActiveKey(key)
    navigate(path)
  }

  const handleTabClose = (e: React.MouseEvent, key: string) => {
    e.stopPropagation()
    const tab = tabs.find((t) => t.key === key)
    if (tab?.closable !== false) {
      removeTab(key)
      const newActiveTab = tabs.find((t) => t.key !== key)
      if (newActiveTab && activeKey === key) {
        navigate(newActiveTab.path)
      }
    }
  }

  return (
    <div className="flex h-10 items-center border-b bg-muted/40">
      <ScrollArea className="flex-1">
        <div className="flex items-center gap-1 px-2">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              onClick={() => handleTabClick(tab.key, tab.path)}
              className={cn(
                "group flex items-center gap-1 px-3 py-1.5 text-sm cursor-pointer transition-all duration-200",
                activeKey === tab.key
                  ? "rounded-t-lg bg-background text-foreground border-t-2 border-l-2 border-r-2 border-primary/40 shadow-md font-semibold -mb-px relative z-10"
                  : "rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground hover:shadow-sm"
              )}
            >
              <span>
                {tab.labelKey
                  ? t(tab.labelKey, { defaultValue: tab.label })
                  : tab.label}
              </span>
              {tab.closable !== false && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => handleTabClose(e, tab.key)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-2" />
      </ScrollArea>
    </div>
  )
}
