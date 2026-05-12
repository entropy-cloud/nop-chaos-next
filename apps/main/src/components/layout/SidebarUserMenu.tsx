import { Languages, LogOut, MoreHorizontal, PanelsTopLeft, Palette, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@nop-chaos/ui';
import { useAuth } from '../../hooks/useAuth';

interface SidebarUserMenuProps {
  collapsed?: boolean;
  onLogout: () => void;
  onToggleSidebar?: () => void;
  onActionComplete?: () => void;
}

export function SidebarUserMenu({
  collapsed = false,
  onLogout,
  onToggleSidebar,
  onActionComplete,
}: SidebarUserMenuProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const displayName = user?.nickname ?? user?.username ?? t('common.user');
  const secondaryLabel = user?.email ?? user?.roles.join(', ');
  const handleNavigate = (path: string) => {
    navigate(path);
    onActionComplete?.();
  };

  const handleToggleSidebar = () => {
    onToggleSidebar?.();
    onActionComplete?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="flex w-full items-center gap-2 rounded-xl border border-[hsl(var(--border))] bg-[var(--card-surface)] px-2 py-2 text-left shadow-sm backdrop-blur-xl transition-colors hover:bg-[color-mix(in_hsl,hsl(var(--primary))_6%,var(--card-surface))]"
            data-testid="sidebar-user-menu-trigger"
            title={t('common.moreActions')}
            type="button"
          />
        }
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={user?.avatar} alt={displayName} />
            <AvatarFallback>{displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          {collapsed ? null : (
            <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
          )}
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors group-data-[state=open]:bg-black/5 group-data-[state=open]:text-foreground dark:group-data-[state=open]:bg-white/10">
          <MoreHorizontal className="size-4" />
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" sideOffset={8} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="py-2">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={user?.avatar} alt={displayName} />
                <AvatarFallback>{displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{displayName}</div>
                {secondaryLabel ? (
                  <div className="meta-text truncate font-normal">{secondaryLabel}</div>
                ) : null}
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="sidebar-user-menu-settings"
          onClick={() => handleNavigate('/settings')}
        >
          <Settings2 className="size-4" />
          {t('settings.title')}
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="sidebar-user-menu-theme"
          onClick={() => handleNavigate('/settings/theme')}
        >
          <Palette className="size-4" />
          {t('settings.themeTitle')}
        </DropdownMenuItem>
        <DropdownMenuItem
          data-testid="sidebar-user-menu-language"
          onClick={() => handleNavigate('/settings/language')}
        >
          <Languages className="size-4" />
          {t('settings.languageTitle')}
        </DropdownMenuItem>
        {onToggleSidebar ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleToggleSidebar}>
              <PanelsTopLeft className="size-4" />
              {collapsed ? t('layout.expandSidebar') : t('layout.collapseSidebar')}
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="sidebar-user-menu-logout"
          variant="destructive"
          onClick={onLogout}
        >
          <LogOut className="size-4" />
          {t('auth.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
