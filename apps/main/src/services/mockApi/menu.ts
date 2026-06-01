import { validateMenuResponse, type MenuResponse } from '@nop-chaos/shared';
import { mainHttpClient } from '../http';
import { wait } from './shared';

export async function fetchMenuConfig(): Promise<MenuResponse> {
  const response = await mainHttpClient.request<MenuResponse>({
    url: '/data/menu-config.json',
    withAuth: false,
    headers: {
      Accept: 'application/json',
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Failed to load menu config: ${response.status}`);
  }

  return wait(validateMenuResponse(response.data), 260);
}
