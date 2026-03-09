import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Settings, ChevronDown, type LucideIcon } from "lucide-react"
import { useTabStore } from "@/stores/tabs"
import { useMenuStore } from "@/stores/menu"
import type { MenuItem } from "@/types/menu"
import * as LucideIcons from "lucide-react"
import { useMemo, useState, useEffect, useCallback } from "react"

const getIconComponent = (iconName?: string): LucideIcon | null => {
  if (!iconName) return null

  const iconKey = iconName
  const iconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[
    iconKey
  ]
  if (iconComponent) return iconComponent

  const pascalCaseName = iconName
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("")

  const pascalIconComponent = (
    LucideIcons as unknown as Record<string, LucideIcon>
  )[pascalCaseName]
  return pascalIconComponent || null
}

interface NavItemProps {
  item: MenuItem
  collapsed: boolean
  level?: number
  activePath: string
  onNavClick: (item: MenuItem) => void
  expandedIds: string[]
  onToggleExpand: (id: string) => void
}

function NavItem({
  item,
  collapsed,
  level = 0,
  activePath,
  onNavClick,
  expandedIds,
  onToggleExpand,
}: NavItemProps) {
  const { t } = useTranslation()
  const IconComponent = getIconComponent(item.icon)
  const hasChildren = item.children && item.children.length > 0
  const isActive = activePath === item.path
  const isExpanded = expandedIds.includes(item.id)
  const isChildActive =
    hasChildren && item.children!.some((child) => activePath === child.path)

  return (
    <div className="flex flex-col gap-1">
      {hasChildren ? (
        <Collapsible
          open={isExpanded}
          onOpenChange={() => !collapsed && onToggleExpand(item.id)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant={isChildActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3",
                (isChildActive || isActive) &&
                  "bg-sidebar-accent text-sidebar-accent-foreground",
                level > 0 && "ml-4"
              )}
            >
              {IconComponent && <IconComponent className="h-4 w-4 shrink-0" />}
              {!collapsed && (
                <>
                  <span
                    className={cn("truncate", level === 0 ? "font-medium" : "")}
                  >
                    {item.labelKey
                      ? t(item.labelKey, { defaultValue: item.title })
                      : item.title}
                  </span>
                  <ChevronDown
                    className={cn(
                      "ml-auto h-4 w-4 shrink-0 transition-transform duration-200",
                      isExpanded && "rotate-90"
                    )}
                  />
                  {item.badge && (
                    <Badge
                      variant="default"
                      className="ml-auto text-xs gradient-primary text-white shrink-0"
                    >
                      {item.badge}
                    </Badge>
                  )}
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {!collapsed && (
              <div className="flex flex-col gap-2 ml-4 mt-1">
                {item.children!.map((child) => (
                  <NavItem
                    key={child.id}
                    item={child}
                    collapsed={collapsed}
                    level={level + 1}
                    activePath={activePath}
                    onNavClick={onNavClick}
                    expandedIds={expandedIds}
                    onToggleExpand={onToggleExpand}
                  />
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <Link key={item.id} to={item.path || "#"}>
          <Button
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3",
              isActive &&
                "bg-sidebar-accent text-sidebar-accent-foreground font-medium",
              level > 0 && "ml-4"
            )}
            onClick={() => onNavClick(item)}
          >
            {IconComponent && <IconComponent className="h-4 w-4 shrink-0" />}
            {!collapsed && (
              <>
                <span className="truncate">
                  {item.labelKey
                    ? t(item.labelKey, { defaultValue: item.title })
                    : item.title}
                </span>
                {item.badge && (
                  <Badge
                    variant="default"
                    className="ml-auto text-xs gradient-primary text-white shrink-0"
                  >
                    {item.badge}
                  </Badge>
                )}
              </>
            )}
          </Button>
        </Link>
      )}
    </div>
  )
}

interface SidebarProps {
  collapsed?: boolean
}

export function Sidebar({ collapsed = false }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { addTab, setActiveKey } = useTabStore()
  const { menus } = useMenuStore()
  const [expandedIds, setExpandedIds] = useState<string[]>([])

  const visibleMenus = useMemo(() => {
    function filterHidden(items: MenuItem[]): MenuItem[] {
      return items
        .filter((item) => !item.meta?.hidden)
        .map((item) => ({
          ...item,
          children: item.children ? filterHidden(item.children) : undefined,
        }))
    }
    return filterHidden(menus)
  }, [menus])

  useEffect(() => {
    function findParentIds(items: MenuItem[], currentPath: string): string[] {
      const parentIds: string[] = []

      function search(items: MenuItem[]): boolean {
        for (const item of items) {
          if (item.children && item.children.length > 0) {
            const hasActiveChild = item.children.some(
              (child) => child.path === currentPath
            )

            if (hasActiveChild) {
              parentIds.push(item.id)
              search(item.children)
            }
          }
        }
        return false
      }

      search(items)
      return parentIds
    }

    setExpandedIds(findParentIds(visibleMenus, location.pathname))
  }, [location.pathname, visibleMenus])

  const handleNavClick = useCallback(
    (item: MenuItem) => {
      if (!item.path) return

      addTab({
        key: item.path,
        label: item.title,
        labelKey: item.labelKey,
        path: item.path,
        closable: item.meta?.closable ?? item.path !== "/",
      })
      setActiveKey(item.path)
    },
    [addTab, setActiveKey, t]
  )

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }, [])

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r bg-sidebar-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="relative flex h-14 items-center border-b">
        <Link
          to="/"
          className={cn(
            "flex items-center gap-2 font-semibold px-4 transition-all duration-300",
            collapsed ? "opacity-0 pointer-events-none absolute" : "opacity-100"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-primary-foreground shrink-0">
            NC
          </div>
          <span className="gradient-text text-lg font-bold whitespace-nowrap">
            nop-chaos-next
          </span>
        </Link>
        <div
          className={cn(
            "absolute left-0 right-0 flex justify-center transition-all duration-300",
            !collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-primary-foreground animate-pulse-glow">
            NC
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {visibleMenus.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              activePath={location.pathname}
              onNavClick={handleNavClick}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
            />
          ))}
        </nav>
      </ScrollArea>

      <Separator />

      <div className="p-3">
        <Button variant="ghost" className="w-full justify-start gap-3">
          <Settings className="h-4 w-4" />
          {!collapsed && <span>{t("sidebar.settings")}</span>}
        </Button>
      </div>
    </aside>
  )
}
