import { mergeBuiltinSystemMenus } from '../config/system-menus';
import { isMockEnabled } from '../config/env';
import type { MenuResponse } from '@nop-chaos/shared';
import { ajaxFetch } from './http';
import { mapLegacySiteMapToMenuResponse, type LegacySiteMapResponse } from './menu-mapper';
import { fetchMenuConfig as fetchMockMenuConfig } from './mock-api';
import { useAuthStore } from '../store/auth-store';

export async function fetchMenuConfig(): Promise<MenuResponse> {
  if (isMockEnabled()) {
    return mergeBuiltinSystemMenus(await fetchMockMenuConfig());
  }

  const token = useAuthStore.getState().token;

  const payload = await ajaxFetch<LegacySiteMapResponse>('/r/SiteMapApi__getSiteMap', {
    method: 'POST',
    withAuth: false,
    headers: token
      ? {
          'x-access-token': token,
          authorization: `Bearer ${token}`,
        }
      : undefined,
    data: {
      siteId: 'main',
    },
  });

  return mergeBuiltinSystemMenus(mapLegacySiteMapToMenuResponse(payload));
}
