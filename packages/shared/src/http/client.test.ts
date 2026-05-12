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
});
