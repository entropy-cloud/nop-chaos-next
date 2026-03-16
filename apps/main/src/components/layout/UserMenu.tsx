import { LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback, AvatarImage, Button } from '@nop-chaos/ui'
import { useAuth } from '../../hooks/useAuth'

interface UserMenuProps {
  onLogout: () => void
}

export function UserMenu({ onLogout }: UserMenuProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const userLabel = user?.nickname ?? user?.username ?? t('common.user')
  const userInitial = userLabel.slice(0, 1).toUpperCase()

  return (
    <div className="flex items-center gap-3 rounded-full border border-[hsl(var(--border))] bg-[var(--card-surface)] px-2 py-1.5 backdrop-blur-xl">
      <Avatar className="h-9 w-9">
        <AvatarImage src={user?.avatar} alt={userLabel} />
        <AvatarFallback>{userInitial}</AvatarFallback>
      </Avatar>
      <div className="hidden min-w-0 sm:block">
        <div className="truncate text-sm font-medium text-foreground">{userLabel}</div>
        <div className="meta-text truncate">{user?.roles.join(', ')}</div>
      </div>
      <Button variant="ghost" size="icon" onClick={onLogout} title={t('auth.logout')}>
        <LogOut className="size-4" />
      </Button>
    </div>
  )
}
