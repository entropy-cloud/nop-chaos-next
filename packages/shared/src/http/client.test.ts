import { describe, expect, it, vi } from 'vitest';
import { createHttpClient } from './client';

describe('createHttpClient', () => {
  it('adds auth headers, resolves query params, and updates response token', async () => {
    const setAuthToken = vi.fn();
    const client = createHttpClient({
      getBaseUrl: () => '/api',
      getLocale: () => 'zh-CN',
      getAuthToken: () => 'token-1',
      setAuthToken,
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);

      expect(String(input)).toBe('/api/demo?page=2&tags=a&tags=b');
      expect(init?.method).toBe('POST');
      expect(headers.get('authorization')).toBe('Bearer token-1');
      expect(headers.get('x-access-token')).toBe('token-1');
      expect(headers.get('nop-locale')).toBe('zh-CN');

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'x-access-token': 'token-2',
        },
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const response = await client.request<{ ok: boolean }>({
      url: '/demo',
      query: {
        page: 2,
        tags: ['a', 'b'],
      },
      data: {
        id: 1,
      },
    });

    expect(response).toMatchObject({
      status: 200,
      data: {
        ok: true,
      },
    });
    expect(setAuthToken).toHaveBeenCalledWith('token-2');
  });

  it('calls unauthorized callback on 401 responses', async () => {
    const onUnauthorized = vi.fn();
    const client = createHttpClient({
      getBaseUrl: () => '',
      getLocale: () => 'en-US',
      getAuthToken: () => undefined,
      onUnauthorized,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('denied', {
            status: 401,
            headers: {
              'content-type': 'text/plain',
            },
          }),
      ),
    );

    const response = await client.request({ url: '/secure' });

    expect(response).toMatchObject({
      status: 401,
      data: 'denied',
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('deduplicates concurrent 401 refresh calls', async () => {
    let refreshResolve: (token: string) => void;
    const refreshAccessToken = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          refreshResolve = resolve;
        }),
    );

    const client = createHttpClient({
      getBaseUrl: () => '',
      getLocale: () => 'en-US',
      getAuthToken: () => 'expired-token',
      getRefreshToken: () => 'refresh-token',
      refreshAccessToken,
      onUnauthorized: vi.fn(),
    });

    let callCount = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        callCount += 1;
        if (callCount <= 3) {
          return new Response(JSON.stringify({ error: 'unauthorized' }), {
            status: 401,
            headers: { 'content-type': 'application/json' },
          });
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );

    const promises = [
      client.request({ url: '/a' }),
      client.request({ url: '/b' }),
      client.request({ url: '/c' }),
    ];

    await new Promise((r) => setTimeout(r, 0));
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);

    refreshResolve!('new-token');
    const results = await Promise.all(promises);

    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });
});
