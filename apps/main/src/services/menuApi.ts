import { mergeBuiltinSystemMenus } from '../config/systemMenus';
import { isMockEnabled, isPrototypeMode } from '../config/env';
import { getShellProfile } from '../config/profile';
import type { MenuItem, MenuResponse } from '@nop-chaos/shared';
import { ajaxFetch } from './http';
import { mapLegacySiteMapToMenuResponse, type LegacySiteMapResponse } from './menuMapper';
import { fetchMenuConfig as fetchMockMenuConfig } from './mockApi';
import { useAuthStore } from '../store/authStore';

const PROTOTYPE_MENU_URL = '/api/prototype/menu.json';

function resolvePrototypeSchemaPath(item: MenuItem): MenuItem {
  const children = item.children?.map(resolvePrototypeSchemaPath);

  if (!item.schemaPath) {
    return { ...item, children };
  }

  const cleaned = item.schemaPath.replace(/^\.\//, '');
  return {
    ...item,
    children,
    schemaPath: `/api/prototype/pages/${cleaned}`,
  };
}

async function fetchPrototypeMenuConfig(): Promise<MenuResponse> {
  const response = await ajaxFetch<MenuResponse>(PROTOTYPE_MENU_URL, {
    method: 'GET',
    withAuth: false,
    headers: { Accept: 'application/json' },
  });
  return {
    ...response,
    items: response.items.map(resolvePrototypeSchemaPath),
  };
}

export async function fetchMenuConfig(): Promise<MenuResponse> {
  if (isPrototypeMode()) {
    return mergeBuiltinSystemMenus(await fetchPrototypeMenuConfig());
  }

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
      siteId: getShellProfile().siteId,
    },
  });

  return mergeBuiltinSystemMenus(mapLegacySiteMapToMenuResponse(payload));
}
