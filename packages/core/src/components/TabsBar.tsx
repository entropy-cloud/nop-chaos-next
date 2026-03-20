import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, MoreHorizontal, RefreshCcw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AppTab } from '@nop-chaos/shared'
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, cn } from '@nop-chaos/ui'
import { resolveIcon } from '../utils/iconMap'

interface TabsBarProps {
  tabs: AppTab[]
  activePath: string
  onSelect: (path: string) => void
  onClose: (path: string) => void
  onCloseOthers: (path: string) => void
  onCloseAll: () => void
  onRefresh: (path: string) => void
  onToggleFullscreen?: () => void
  isFullscreen?: boolean
}

interface MenuState {
  path: string
  x: number
  y: number
  align?: 'left' | 'right'
}

const MENU_WIDTH = 160
const MENU_HEIGHT = 168
const VIEWPORT_PADDING = 12

interface TabContextMenuProps {
  menuState: MenuState | null
  onClose: () => void
  onRefresh: (path: string) => void
  onCloseCurrent: (path: string) => void
  onCloseOthers: (path: string) => void
  onCloseAll: () => void
}

function TabContextMenu({ menuState, onClose, onRefresh, onCloseCurrent, onCloseOthers, onCloseAll }: TabContextMenuProps) {
  const { t } = useTranslation()

  if (!menuState) {
    return null
  }

  const items = [
    { label: t('tabsBar.refresh'), action: () => onRefresh(menuState.path) },
    { label: t('tabsBar.closeCurrent'), action: () => onCloseCurrent(menuState.path) },
    { label: t('tabsBar.closeOthers'), action: () => onCloseOthers(menuState.path) },
    { label: t('tabsBar.closeAll'), action: onCloseAll }
  ]

  const top = Math.max(VIEWPORT_PADDING, Math.min(menuState.y, window.innerHeight - MENU_HEIGHT - VIEWPORT_PADDING))
  const menuStyle =
    menuState.align === 'right'
      ? {
          right: Math.max(VIEWPORT_PADDING, window.innerWidth - menuState.x),
          top
        }
      : {
          left: Math.max(VIEWPORT_PADDING, Math.min(menuState.x, window.innerWidth - MENU_WIDTH - VIEWPORT_PADDING)),
          top
        }

  return (
    <div className="fixed inset-0 z-50" onClick={onClose} onContextMenu={(event) => event.preventDefault()}>
      <div
        className="absolute min-w-40 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[var(--card-surface)] p-1 shadow-lg backdrop-blur-2xl"
        style={menuStyle}
      >
        {items.map((item) => (
          <button
            key={item.label}
            className="flex w-full items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-[color-mix(in_hsl,hsl(var(--primary))_10%,transparent)]"
            onClick={() => {
              item.action()
              onClose()
            }}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TabsBar({
  tabs,
  activePath,
  onSelect,
  onClose,
  onCloseOthers,
  onCloseAll,
  onRefresh,
  onToggleFullscreen,
  isFullscreen = false
}: TabsBarProps) {
  const { t } = useTranslation()
  const [menuState, setMenuState] = useState<MenuState | null>(null)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const activeTab = useMemo(() => tabs.find((tab) => tab.path === activePath), [activePath, tabs])
  const scrollViewportRef = useRef<HTMLDivElement | null>(null)
  const scrollContentRef = useRef<HTMLDivElement | null>(null)
  const tabRefs = useRef(new Map<string, HTMLDivElement>())

  useEffect(() => {
    const viewport = scrollViewportRef.current
    const content = scrollContentRef.current

    if (!viewport || !content) {
      return
    }

    const updateScrollState = () => {
      const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
      const nextOverflowing = maxScrollLeft > 1

      setIsOverflowing(nextOverflowing)
      setCanScrollLeft(viewport.scrollLeft > 1)
      setCanScrollRight(viewport.scrollLeft < maxScrollLeft - 1)
    }

    updateScrollState()
    viewport.addEventListener('scroll', updateScrollState, { passive: true })

    const resizeObserver = new ResizeObserver(() => updateScrollState())
    resizeObserver.observe(viewport)
    resizeObserver.observe(content)
    window.addEventListener('resize', updateScrollState)

    return () => {
      viewport.removeEventListener('scroll', updateScrollState)
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateScrollState)
    }
  }, [tabs])

  useEffect(() => {
    const activeTabElement = tabRefs.current.get(activePath)

    activeTabElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [activePath, tabs])

  const scrollTabs = (direction: 'left' | 'right') => {
    const viewport = scrollViewportRef.current

    if (!viewport) {
      return
    }

    const delta = Math.max(viewport.clientWidth * 0.6, 180) * (direction === 'left' ? -1 : 1)

    viewport.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <>
      <div className="hidden border-b border-[hsl(var(--border))] bg-[var(--app-tabs-bg)]/90 backdrop-blur-2xl lg:block">
        <div className="flex h-12 items-center gap-3 px-4 py-2 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {isOverflowing ? (
              <Button variant="ghost" size="icon-sm" className="shrink-0" disabled={!canScrollLeft} onClick={() => scrollTabs('left')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            ) : null}
            <div ref={scrollViewportRef} className="tab-strip min-w-0 flex-1 overflow-x-auto overflow-y-hidden scroll-smooth">
              <div ref={scrollContentRef} className="flex w-max min-w-full items-center gap-2">
                {tabs.map((tab) => {
                  const active = tab.path === activePath
                  const Icon = resolveIcon(tab.icon)

                  return (
                    <div
                      key={tab.path}
                      ref={(node) => {
                        if (node) {
                          tabRefs.current.set(tab.path, node)
                          return
                        }

                        tabRefs.current.delete(tab.path)
                      }}
                      className={cn(
                        'tab-item group flex shrink-0 items-center gap-2 rounded-t-[var(--radius-sm)] border-b-2 px-3 py-2 text-sm transition-all duration-200',
                        active
                          ? 'border-primary bg-[color-mix(in_hsl,hsl(var(--primary))_10%,transparent)] text-foreground'
                          : 'border-transparent text-[hsl(var(--gray-500))] hover:text-foreground'
                      )}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        setMenuState({ path: tab.path, x: event.clientX, y: event.clientY, align: 'left' })
                      }}
                    >
                      <button className="flex items-center gap-2" onClick={() => onSelect(tab.path)} type="button">
                        <Icon className="h-4 w-4" />
                        <span>{tab.title}</span>
                      </button>
                      {tab.closable === false ? null : (
                        <button className="rounded-full p-1 transition-colors hover:bg-[hsl(var(--gray-100))]" onClick={() => onClose(tab.path)} type="button">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            {isOverflowing ? (
              <Button variant="ghost" size="icon-sm" className="shrink-0" disabled={!canScrollRight} onClick={() => scrollTabs('right')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {activeTab ? (
              <Button variant="ghost" size="icon" onClick={() => onRefresh(activeTab.path)}>
                <RefreshCcw className="h-4 w-4" />
              </Button>
            ) : null}
            {onToggleFullscreen ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={isFullscreen ? t('tabsBar.exitFullscreenWorkspace') : t('tabsBar.enterFullscreenWorkspace')}
                      onClick={onToggleFullscreen}
                    >
                      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" sideOffset={8}>
                    {isFullscreen ? t('tabsBar.exitFullscreen') : t('tabsBar.enterFullscreen')}
                    {' '}
                    <span className="opacity-80">Ctrl+Shift+F</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                setMenuState({ path: activePath, x: rect.right, y: rect.bottom + 8, align: 'right' })
              }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <TabContextMenu
        menuState={menuState}
        onClose={() => setMenuState(null)}
        onRefresh={onRefresh}
        onCloseCurrent={onClose}
        onCloseOthers={onCloseOthers}
        onCloseAll={onCloseAll}
      />
    </>
  )
}
