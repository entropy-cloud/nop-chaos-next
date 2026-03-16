import { ArrowUpRight, Blocks, Puzzle, Sparkles } from 'lucide-react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@nop-chaos/ui'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { usePluginStore } from '../../store/pluginStore'

export function PluginMountPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const plugins = usePluginStore((state) => state.plugins)
  const enabledPlugins = plugins.filter((plugin) => plugin.enabled)

  if (enabledPlugins.length === 0) {
    return (
      <Card className="theme-card overflow-hidden border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Puzzle className="size-5 text-[hsl(var(--primary))]" />
            {t('plugins.mountTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="rounded-3xl border border-dashed border-[hsl(var(--border))] bg-white/35 p-5 text-sm text-muted-foreground backdrop-blur-xl dark:bg-slate-900/30">
          {t('plugins.mountEmpty')}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="theme-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <div className="eyebrow-text tracking-[0.22em]">{t('plugins.runtimeEyebrow')}</div>
          <CardTitle className="mt-3 flex items-center gap-2 text-lg">
            <Blocks className="size-5 text-[hsl(var(--primary))]" />
            {t('plugins.mountTitle')}
          </CardTitle>
        </div>
        <Button variant="outline" onClick={() => navigate('/plugins/management')}>
          {t('plugins.manageAction')}
          <ArrowUpRight className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {enabledPlugins.map((plugin, index) => (
          <div
            key={plugin.id}
            className="list-item-animate rounded-xl border border-[hsl(var(--border))] bg-white/40 p-5 backdrop-blur-xl dark:bg-slate-900/35"
            style={{ animationDelay: `${index * 0.08}s` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">{plugin.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">{plugin.source}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_hsl,hsl(var(--primary))_12%,transparent)] text-[hsl(var(--primary-dark))]">
                <Sparkles className="size-4" />
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{plugin.description}</p>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>{t('common.versionValue', { value: plugin.version })}</span>
              <button className="font-medium text-[hsl(var(--primary))]" onClick={() => navigate('/plugins/demo')} type="button">
                {t('plugins.openAction')}
              </button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
