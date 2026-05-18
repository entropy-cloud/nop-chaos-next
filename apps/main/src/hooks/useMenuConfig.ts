import { useQuery } from '@tanstack/react-query';
import type { MenuResponse } from '@nop-chaos/shared';
import { fetchMenuConfig } from '../services/menuApi';
import { useAuthStore } from '../store/authStore';

export function useMenuConfigQuery(enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  const token = useAuthStore((state) => state.token);

  return useQuery<MenuResponse>({
    queryKey: ['menus', userId ?? 'anonymous', token ?? 'no-token'],
    queryFn: fetchMenuConfig,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
