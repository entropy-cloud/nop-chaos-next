import { Menu } from 'lucide-react';
import { Button } from '@nop-chaos/ui';
import { SidebarUserMenu } from './SidebarUserMenu';

interface MobileTopBarProps {
  title: string;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export function MobileTopBar({ title, onToggleSidebar, onLogout }: MobileTopBarProps) {
  return (
    <div className="border-b border-[hsl(var(--border))] bg-[var(--app-topbar-bg)]/90 backdrop-blur-2xl lg:hidden">
      <div className="flex h-14 items-center gap-3 px-4">
        <Button variant="ghost" size="icon-sm" className="shrink-0" onClick={onToggleSidebar}>
          <Menu className="size-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{title}</div>
        </div>
        <div className="shrink-0">
          <SidebarUserMenu collapsed onLogout={onLogout} />
        </div>
      </div>
    </div>
  );
}
