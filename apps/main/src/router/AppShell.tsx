import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MainLayout, Sidebar, TabsBar } from '@nop-chaos/core'
import { filterMenusByRoles, findMenuItemByPath, sortMenus, type MenuItem } from '@nop-chaos/shared'
import { Button, Skeleton, toast } from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AppBrand } from '../components/layout/AppBrand'
import { MobileTopBar } from '../components/layout/MobileTopBar'
import { SidebarUserMenu } from '../components/layout/SidebarUserMenu'
import { toRem } from '../config/layout'
import { useAuth } from '../hooks/useAuth'
import { useMenuConfigQuery } from '../hooks/useMenuConfig'
import { useTabManagement } from '../hooks/useTabManagement'
import { logoutRequest } from '../services/authApi'
import { useLayoutStore } from '../store/layoutStore'
import { useTabStore } from '../store/tabStore'

function localizeMenus(items: MenuItem[], t: (key: string) => string): MenuItem[] {
  return items.map((item) => ({
    ...item,
    title: item.titleKey ? t(item.titleKey) : item.title,
    children: item.children ? localizeMenus(item.children, t) : undefined
  }))
}

function LoadingView() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
      <Skeleton className="h-40 rounded-3xl" />
    </div>
  )
}

export function AppShell() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user, token, logout } = useAuth()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const sidebarCollapsed = useLayoutStore((state) => state.sidebarCollapsed)
  const sidebarWidth = toRem(useLayoutStore((state) => state.sidebarWidthRem))
  const sidebarCollapsedWidth = toRem(useLayoutStore((state) => state.sidebarCollapsedWidthRem))
  const expandedMenuIds = useLayoutStore((state) => state.expandedMenuIds)
  const workspaceFullscreen = useLayoutStore((state) => state.workspaceFullscreen)
  const toggleSidebar = useLayoutStore((state) => state.toggleSidebar)
  const toggleMenuGroup = useLayoutStore((state) => state.toggleMenuGroup)
  const setWorkspaceFullscreen = useLayoutStore((state) => state.setWorkspaceFullscreen)
  const registerTab = useTabStore((state) => state.openTab)
  const tabs = useTabManagement()

  const menuQuery = useMenuConfigQuery()

  const menuItems = useMemo(() => {
    const sorted = sortMenus(menuQuery.data?.items ?? [])
    const filtered = filterMenusByRoles(sorted, user?.roles ?? [])
    return localizeMenus(filtered, t)
  }, [menuQuery.data?.items, t, user?.roles])

  const currentMenu = useMemo(() => findMenuItemByPath(menuItems, location.pathname), [location.pathname, menuItems])

  useEffect(() => {
    if (!currentMenu) {
      return
    }

    registerTab({
      path: location.pathname,
      title: currentMenu.title ?? currentMenu.id,
      icon: currentMenu.icon,
      closable: location.pathname !== '/dashboard'
    })
  }, [currentMenu, location.pathname, registerTab])

  useEffect(() => {
    const syncFullscreenState = () => {
      setWorkspaceFullscreen(document.fullscreenElement === shellRef.current)
    }

    document.addEventListener('fullscreenchange', syncFullscreenState)

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState)
    }
  }, [setWorkspaceFullscreen])

  const handleToggleWorkspaceFullscreen = useCallback(async () => {
    const shellElement = shellRef.current

    if (!shellElement) {
      return
    }

    const isShellFullscreen = document.fullscreenElement === shellElement
    setMobileSidebarOpen(false)

    if (workspaceFullscreen || isShellFullscreen) {
      setWorkspaceFullscreen(false)

      if (document.fullscreenElement) {
        try {
          await document.exitFullscreen()
        } catch {
          return
        }
      }

      return
    }

    setWorkspaceFullscreen(true)

    if (document.fullscreenEnabled && typeof shellElement.requestFullscreen === 'function') {
      try {
        await shellElement.requestFullscreen()
      } catch {
        return
      }
    }
  }, [setWorkspaceFullscreen, workspaceFullscreen])

  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return false
      }

      const tagName = target.tagName.toLowerCase()

      return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select'
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return
      }

      const key = event.key.toLowerCase()
      const shouldToggle = key === 'f11' || (event.ctrlKey && event.shiftKey && key === 'f')

      if (!shouldToggle) {
        return
      }

      event.preventDefault()
      void handleToggleWorkspaceFullscreen()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleToggleWorkspaceFullscreen])

  const handleLogout = async () => {
    if (!window.confirm(t('auth.logoutConfirm'))) {
      return
    }

    await logoutRequest(token)
    logout()
    navigate('/auth/login', { replace: true })
    toast.success(t('auth.loggedOut'))
  }

  const shellSidebar = (
    <div className="relative h-screen overflow-visible">
      <Sidebar
        items={menuItems}
        activePath={location.pathname}
        expandedIds={expandedMenuIds}
        collapsed={sidebarCollapsed}
        brand={<AppBrand compact={sidebarCollapsed} />}
        footer={<SidebarUserMenu collapsed={sidebarCollapsed} onLogout={() => void handleLogout()} onToggleSidebar={toggleSidebar} />}
        onNavigate={(path) => {
          navigate(path)
          setMobileSidebarOpen(false)
        }}
        onToggleGroup={toggleMenuGroup}
      />
      <Button
        variant="outline"
        size="icon-sm"
        className="absolute -right-4 top-7 z-10 max-lg:hidden rounded-full border border-[hsl(var(--border))] bg-[var(--card-surface)] shadow-md"
        onClick={toggleSidebar}
      >
        {sidebarCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
      </Button>
    </div>
  )

  return (
    <div
      ref={shellRef}
      style={{
        ['--sidebar-width' as string]: sidebarCollapsed ? sidebarCollapsedWidth : sidebarWidth,
        ['--sidebar-width-expanded' as string]: sidebarWidth,
        ['--sidebar-width-collapsed' as string]: sidebarCollapsedWidth
      }}
    >
      <MainLayout
        sidebar={shellSidebar}
        topBar={<MobileTopBar title={currentMenu?.title ?? t('common.loading')} onToggleSidebar={() => setMobileSidebarOpen((value) => !value)} onLogout={() => void handleLogout()} />}
        mobileSidebar={
          <div className="w-[var(--sidebar-width-expanded)] max-w-[80vw]">
            <Sidebar
              items={menuItems}
              activePath={location.pathname}
              expandedIds={expandedMenuIds}
              collapsed={false}
              brand={<AppBrand />}
              footer={<SidebarUserMenu onLogout={() => void handleLogout()} onActionComplete={() => setMobileSidebarOpen(false)} />}
              onNavigate={(path) => {
                navigate(path)
                setMobileSidebarOpen(false)
              }}
              onToggleGroup={toggleMenuGroup}
            />
          </div>
        }
        mobileSidebarOpen={mobileSidebarOpen}
        workspaceFullscreen={workspaceFullscreen}
        tabsBar={
          <TabsBar
            tabs={tabs.tabs}
            activePath={location.pathname}
            onSelect={tabs.setActivePath}
            onClose={tabs.closeTab}
            onCloseOthers={tabs.closeOtherTabs}
            onCloseAll={tabs.closeAllTabs}
            onRefresh={() => window.location.reload()}
            onToggleFullscreen={() => void handleToggleWorkspaceFullscreen()}
            isFullscreen={workspaceFullscreen}
          />
        }
      >
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="theme-blob blob-a" />
          <div className="theme-blob blob-b" />
          <div className="theme-blob blob-c" />
        </div>
        {menuQuery.isLoading ? <LoadingView /> : <Outlet />}
      </MainLayout>
    </div>
  )
}
