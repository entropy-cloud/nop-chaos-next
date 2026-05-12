import { Bell } from 'lucide-react';
import { Badge, Button, toast } from '@nop-chaos/ui';
import { useTranslation } from 'react-i18next';

export function NotificationButton() {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full border border-[hsl(var(--border))] bg-[var(--card-surface)] backdrop-blur-xl"
        onClick={() => toast.info(t('common.pendingAlerts'))}
      >
        <Bell className="size-4" />
      </Button>
      <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1">3</Badge>
    </div>
  );
}
