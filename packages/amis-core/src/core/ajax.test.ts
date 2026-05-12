import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAmisRuntimeAdapter } from '../adapter';
import { fetchAmisRequest } from './ajax';

describe('fetchAmisRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    registerAmisRuntimeAdapter({
      getI18n: () =>
        ({
          t: (_key: string, options?: { defaultValue?: string }) =>
            options?.defaultValue || 'translated',
        }) as never,
      getLocale: () => 'en-US',
      getCurrentUser: () => null,
      getAuthToken: () => 'token',
      setAuthToken: () => undefined,
      hasRole: () => false,
      getThemeConfig: () => ({ themeId: 'classic', displayMode: 'light' }),
      navigate: () => undefined,
      isCurrentUrl: () => false,
      notify: () => undefined,
      alert: async () => undefined,
      confirm: async () => true,
      logout: () => undefined,
      pageProvider: { getPage: async () => ({}) },
      dictProvider: {
        getDict: async () => ({ status: 200, data: { status: 0, msg: '', data: [] } }),
      },
    });
  });

  it('normalizes failed network requests into amis payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('Failed to fetch');
      }),
    );

    await expect(fetchAmisRequest({ url: '/demo' })).resolves.toMatchObject({
      status: 0,
      data: {
        status: -1,
        msg: 'Network exception, please check your connection',
      },
    });
  });

  it('maps non-ok http responses without api payload into amis errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('server error', {
            status: 500,
            headers: {
              'content-type': 'text/plain',
            },
          }),
      ),
    );

    await expect(fetchAmisRequest({ url: '/demo' })).resolves.toMatchObject({
      status: 500,
      data: {
        status: -1,
        msg: 'Internal server error',
      },
    });
  });

  it('converts blob json payloads back into object payloads', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            new Blob([JSON.stringify({ status: 0, msg: 'ok', data: { id: 1 } })], {
              type: 'application/json',
            }),
            {
              status: 200,
              headers: {
                'content-type': 'application/json',
              },
            },
          ),
      ),
    );

    await expect(fetchAmisRequest({ url: '/demo', responseType: 'blob' })).resolves.toMatchObject({
      data: {
        status: 0,
        msg: 'ok',
        data: {
          id: 1,
        },
      },
    });
  });
});
