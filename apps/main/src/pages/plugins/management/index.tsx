import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LowCodeIcon } from '@nop-chaos/core';
import { Settings2 } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Switch,
  toast,
} from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../../components/common/PageHeader';
import { fetchPluginList } from '../../../services/mockApi';
import { usePluginStore } from '../../../store/pluginStore';

export default function PluginsManagementPage() {
  const { t } = useTranslation();
  const pluginQuery = useQuery({ queryKey: ['plugins'], queryFn: fetchPluginList });
  const plugins = usePluginStore((state) => state.plugins);
  const setPlugins = usePluginStore((state) => state.setPlugins);
  const updatePlugin = usePluginStore((state) => state.updatePlugin);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [configId, setConfigId] = useState<string | null>(null);

  useEffect(() => {
    if (pluginQuery.data && plugins.length === 0) {
      setPlugins(pluginQuery.data);
    }
  }, [pluginQuery.data, plugins.length, setPlugins]);

  const items = plugins.length > 0 ? plugins : (pluginQuery.data ?? []);
  const detailPlugin = items.find((plugin) => plugin.id === detailId) ?? null;
  const configPlugin = items.find((plugin) => plugin.id === configId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('plugins.extensionHostEyebrow')}
        title={t('plugins.managementTitle')}
        description={t('plugins.managementPageDescription')}
      />
      <div className="grid gap-4">
        {items.map((plugin) => {
          return (
            <Card key={plugin.id} className="theme-card overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(135deg,hsl(var(--primary)),color-mix(in_hsl,hsl(var(--secondary))_70%,white))] text-white shadow-primary-md">
                    <LowCodeIcon className="size-5" name={plugin.icon} />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">{plugin.name}</CardTitle>
                    <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {plugin.description}
                    </div>
                    <div className="meta-text mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>{t('common.versionValue', { value: plugin.version })}</span>
                      <span>{plugin.author}</span>
                      <span>{plugin.source}</span>
                      <span>{plugin.updatedAt}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant={plugin.enabled ? 'success' : 'warning'}>
                    {plugin.enabled ? t('common.enabled') : t('common.disabled')}
                  </Badge>
                  <Switch
                    checked={plugin.enabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const actionKey = checked ? 'common.enable' : 'common.disable';
                      if (
                        !window.confirm(
                          t('plugins.confirmToggle', { action: t(actionKey), name: plugin.name }),
                        )
                      ) {
                        return;
                      }
                      updatePlugin(plugin.id, (current) => ({ ...current, enabled: checked }));
                      toast.success(t('plugins.toggleSuccess', { action: t(actionKey) }));
                    }}
                  />
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-end gap-2 pt-0 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDetailId(plugin.id)}>
                    {t('common.viewDetails')}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setConfigId(plugin.id)}>
                    <Settings2 className="size-4" />
                    {t('plugins.configureAction')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(detailPlugin)} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailPlugin?.name}</DialogTitle>
            <DialogDescription>{t('plugins.detailOverview')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              {t('common.versionLabel')}
              {detailPlugin?.version}
            </div>
            <div>
              {t('common.authorLabel')}
              {detailPlugin?.author}
            </div>
            <div>
              {t('common.sourceLabel')}
              {detailPlugin?.source}
            </div>
            <div>
              {t('common.urlLabel')}
              {detailPlugin?.url}
            </div>
            <div>
              {t('common.descriptionLabel')}
              {detailPlugin?.description}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(configPlugin)} onOpenChange={(open) => !open && setConfigId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('plugins.configureTitle', { name: configPlugin?.name ?? '' })}
            </DialogTitle>
            <DialogDescription>{t('plugins.configureDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {configPlugin?.configSchema?.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={String(configPlugin.settings?.[field.key] ?? field.defaultValue ?? '')}
                  onChange={(event) =>
                    updatePlugin(configPlugin.id, (current) => ({
                      ...current,
                      settings: {
                        ...current.settings,
                        [field.key]:
                          field.type === 'number' ? Number(event.target.value) : event.target.value,
                      },
                    }))
                  }
                />
                {field.type === 'select' && field.options?.length ? (
                  <div className="meta-text flex flex-wrap gap-2">
                    {field.options.map((option) => {
                      const active =
                        String(configPlugin.settings?.[field.key] ?? field.defaultValue ?? '') ===
                        option;
                      return (
                        <button
                          key={option}
                          className={`rounded-full border px-3 py-1 ${active ? 'border-transparent bg-[hsl(var(--primary))] text-white' : 'border-[hsl(var(--border))]'}`}
                          onClick={() =>
                            updatePlugin(configPlugin.id, (current) => ({
                              ...current,
                              settings: {
                                ...current.settings,
                                [field.key]: option,
                              },
                            }))
                          }
                          type="button"
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setConfigId(null)}>{t('common.done')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
