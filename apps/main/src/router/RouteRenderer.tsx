import { Suspense } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AmisPageRoute } from '@nop-chaos/amis-react'
import type { MenuItem } from '@nop-chaos/shared'
import { PluginSlot, usePermissionGuard } from '@nop-chaos/core'
import { Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui'
import { createMainAmisAdapter } from '../amis/adapter'
import { mainAmisDictProvider, mainAmisPageProvider } from '../amis/providers'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import { ensurePluginSharedModules } from '../plugins/sharedModules'
import { usePluginStore } from '../store/pluginStore'
import { ForbiddenPage, ServerErrorPage, getBuiltinPage } from './pageRegistry'

interface RouteRendererProps {
  item: MenuItem
}

export function RouteRenderer({ item }: RouteRendererProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const plugins = usePluginStore((state) => state.plugins)
  const allowed = usePermissionGuard(user?.roles ?? [], item.roles)
  const title = item.title ?? t('common.loading')
  const amisAdapter = createMainAmisAdapter({
    currentPath: location.pathname,
    navigate,
    pageProvider: mainAmisPageProvider,
    dictProvider: mainAmisDictProvider
  })

  const loadingView = (
    <Card className="theme-card">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>{t('common.loading')}</CardContent>
      </Card>
  )

  if (!allowed) {
    return <ForbiddenPage />
  }

  if (item.pageType === 'plugin' && item.pluginUrl) {
    const manifest = plugins.find((plugin) => plugin.id === item.componentId)

    if (!manifest?.enabled) {
      return (
        <Card className="theme-card overflow-hidden border-dashed">
          <CardHeader className="pb-3">
            <CardTitle>{item.title ?? t('common.loading')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-xl border border-dashed border-[hsl(var(--border))] bg-white/40 p-4 backdrop-blur-xl dark:bg-slate-900/25">
              插件未启用，请前往插件管理页面启用后再访问此页面。
            </div>
            <div>当前插件状态：disabled</div>
          </CardContent>
        </Card>
      )
    }

    return <PluginSlot beforeLoad={ensurePluginSharedModules} title={title} url={item.pluginUrl} />
  }

  if (item.pageType === 'amis' && item.schemaPath) {
    return <AmisPageRoute adapter={amisAdapter} schemaPath={item.schemaPath} title={title} />
  }

  if (item.pageType === 'iframe' && item.frameSrc) {
    return (
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[var(--card-surface)] shadow-md">
        <iframe className="h-[calc(100vh-11rem)] w-full" src={item.frameSrc} title={title} />
      </div>
    )
  }

  if (item.pageType === 'external' && item.externalUrl) {
    return (
      <Card className="theme-card">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>{item.externalUrl}</div>
          <a className="text-[hsl(var(--primary))] underline-offset-4 hover:underline" href={item.externalUrl} rel="noreferrer" target="_blank">
            {t('common.viewDetails')}
          </a>
        </CardContent>
      </Card>
    )
  }

  const Page = getBuiltinPage(item.componentId)

  if (!Page) {
    return <ServerErrorPage />
  }

  return (
    <Suspense fallback={loadingView}>
      <Page />
    </Suspense>
  )
}
