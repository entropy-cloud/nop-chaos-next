import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { Bell, Blocks, Compass, Orbit, UserRound } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@nop-chaos/ui'
import { usePluginManifest, usePluginNotifications, usePluginThemeConfig, usePluginUser } from '@nop-chaos/plugin-bridge'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

export default function PluginDemo() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const notifications = usePluginNotifications()
  const user = usePluginUser()
  const theme = usePluginThemeConfig()
  const manifest = usePluginManifest('plugins-demo')
  const currentPath = location.pathname
  const title = String(manifest?.settings?.reportTitle ?? t('plugins.defaultReportTitle'))
  const threshold = Number(manifest?.settings?.highlightThreshold ?? 85)
  const reportData = [
    { label: t('plugins.weekdays.mon'), reports: 16 },
    { label: t('plugins.weekdays.tue'), reports: 21 },
    { label: t('plugins.weekdays.wed'), reports: 19 },
    { label: t('plugins.weekdays.thu'), reports: 25 },
    { label: t('plugins.weekdays.fri'), reports: 28 },
    { label: t('plugins.weekdays.sat'), reports: 24 },
    { label: t('plugins.weekdays.sun'), reports: 30 }
  ]
  const kpiCards = [
    { label: t('plugins.title'), value: `${theme.themeId} / ${theme.displayMode}`, icon: <Orbit className="size-4" /> },
    { label: t('plugins.currentUser'), value: user?.nickname ?? user?.username ?? t('common.guest'), icon: <UserRound className="size-4" /> },
    { label: t('plugins.currentLanguage'), value: i18n.language, icon: <Blocks className="size-4" /> },
    { label: t('plugins.highlightThreshold'), value: `${threshold}%`, icon: <Blocks className="size-4" /> }
  ]

  return (
    <div className="space-y-6">
      <Card className="theme-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <div className="eyebrow-text tracking-[0.22em]">{t('plugins.remotePluginEyebrow')}</div>
            <CardTitle className="mt-3">{title}</CardTitle>
            <div className="mt-2 text-sm text-muted-foreground">
              {t('plugins.placeholder')}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => notifications.success(t('plugins.hostNotification', { user: user?.nickname ?? user?.username ?? t('common.guest') }))}
            >
              <Bell className="size-4" />
              {t('plugins.notifyHost')}
            </Button>
            <Button variant="outline" onClick={() => navigate('/plugins/management')}>
              <Compass className="size-4" />
              {t('plugins.managementTitle')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {kpiCards.map((item) => (
            <div key={item.label} className="rounded-xl border border-[hsl(var(--border))] bg-white/40 p-5 text-sm backdrop-blur-xl dark:bg-slate-900/35">
              <div className="flex items-center justify-between gap-3 text-muted-foreground">
                <span>{item.label}</span>
                {item.icon}
              </div>
              <div className="mt-4 text-lg font-semibold text-foreground">{item.value}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="theme-card overflow-hidden">
        <CardHeader>
          <CardTitle>{t('plugins.analyticsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div
            data-testid="plugin-analytics-chart"
            className="h-[20rem] overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-white/35 p-3 dark:bg-slate-900/35"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pluginReports" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.72} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 18,
                    border: '1px solid hsl(var(--border))',
                    background: 'var(--card-surface)'
                  }}
                />
                <Area type="monotone" dataKey="reports" stroke="hsl(var(--primary))" fill="url(#pluginReports)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-3">
            {[
              { label: t('plugins.weekdays.mon'), value: t('plugins.reportCount', { count: 16 }) },
              { label: t('plugins.weekdays.thu'), value: t('plugins.reportCount', { count: 25 }) },
              { label: t('plugins.weekdays.sun'), value: t('plugins.reportCount', { count: 30 }) }
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-[hsl(var(--border))] bg-white/40 p-4 dark:bg-slate-900/35">
                <div className="eyebrow-text text-muted-foreground">{item.label}</div>
                <div className="mt-2 text-lg font-semibold text-foreground">{item.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="theme-card overflow-hidden">
        <CardHeader>
          <CardTitle>{t('plugins.bridgeTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_0.9fr] text-sm text-muted-foreground">
          <div className="rounded-xl border border-[hsl(var(--border))] bg-white/40 p-5 backdrop-blur-xl dark:bg-slate-900/35">
            {t('plugins.bridgeDescription')}
          </div>
          <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-5">
            {t('plugins.bridgeState', {
              theme: theme?.themeId ?? 'classic',
              user: user?.username ?? t('common.guestLowercase'),
              language: i18n.language,
              path: currentPath,
              status: manifest?.enabled ? t('common.enabledLowercase') : t('common.disabledLowercase')
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
