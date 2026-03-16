import { useQuery } from '@tanstack/react-query'
import type { MenuResponse } from '@nop-chaos/shared'
import { fetchMenuConfig } from '../services/mockApi'

export function useMenuConfigQuery(enabled = true) {
  return useQuery<MenuResponse>({
    queryKey: ['menus'],
    queryFn: fetchMenuConfig,
    enabled,
    staleTime: 5 * 60 * 1000
  })
}
