import type { HttpRequestOptions } from '@nop-chaos/shared';
import { mainHttpClient } from './http';

export async function loadSchemaAsset<T>(
  schemaPath: string,
  options?: Pick<HttpRequestOptions, 'signal'>,
): Promise<T> {
  const response = await mainHttpClient.request<T>({
    url: schemaPath,
    withAuth: false,
    signal: options?.signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Failed to load amis schema: ${response.status}`);
  }

  return response.data;
}
