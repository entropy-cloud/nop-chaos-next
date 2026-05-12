import { Orbit } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useShellConfig } from '../../hooks/use-shell-config';

interface AppBrandProps {
  compact?: boolean;
}

export function AppBrand({ compact = false }: AppBrandProps) {
  const { t } = useTranslation();
  const { branding } = useShellConfig();
  const label = branding.shortName || branding.name;
  const secondaryLabel = branding.name !== label ? branding.name : t('common.operationsConsole');
  const logoSrc = branding.logoUrl ?? branding.markUrl;

  return (
    <div className={compact ? 'flex items-center justify-center' : 'flex items-center gap-3'}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--secondary)))] text-white shadow-primary-md">
        {logoSrc ? (
          <img alt={label} className="h-8 w-8 object-contain" src={logoSrc} />
        ) : (
          <Orbit className="size-5" />
        )}
      </div>
      {compact ? null : (
        <div className="min-w-0">
          <div className="eyebrow-text">{label}</div>
          <div className="truncate text-base font-semibold text-foreground">{secondaryLabel}</div>
        </div>
      )}
    </div>
  );
}
