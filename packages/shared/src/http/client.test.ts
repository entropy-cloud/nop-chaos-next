import { describe, expect, it, vi, afterEach } from 'vitest';
import { createHttpClient } from './client';

function createMockRuntime(overrides: Partial<Parameters<typeof createHttpClient>[0]> = {}) {
  return {
    getBaseUrl: () => '',
    getLocale: () => 'en-US',
    getAuthToken: () => 'token-1',
    ...overrides,
  };
}

describe('createHttpClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it('calls unauthorized callback and rejects when a 401 cannot be refreshed', async () => {
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

    await expect(client.request({ url: '/secure' })).rejects.toThrow('Authentication required');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('clears tokens and triggers unauthorized flow when refresh retry still returns 401', async () => {
    const onUnauthorized = vi.fn();
    const clearTokens = vi.fn();
    const client = createHttpClient({
      getBaseUrl: () => '',
      getLocale: () => 'en-US',
      getAuthToken: () => 'expired-token',
      getRefreshToken: () => 'refresh-token',
      refreshAccessToken: async () => 'fresh-token',
      clearTokens,
      onUnauthorized,
    });

    let callCount = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        callCount += 1;
        return new Response(JSON.stringify({ status: 401, msg: 'unauthorized' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );

    await expect(client.request({ url: '/secure' })).rejects.toThrow('Authentication required');

    expect(callCount).toBe(2);
    expect(clearTokens).toHaveBeenCalledTimes(1);
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

  it('serializes string body as-is', async () => {
    const client = createHttpClient(createMockRuntime());
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toBe('raw-string');
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', data: 'raw-string', method: 'POST' });
  });

  it('serializes FormData body as-is', async () => {
    const client = createHttpClient(createMockRuntime());
    const fd = new FormData();
    fd.append('file', 'content');
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toBe(fd);
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', data: fd, method: 'POST' });
  });

  it('serializes Blob body as-is', async () => {
    const client = createHttpClient(createMockRuntime());
    const blob = new Blob(['data'], { type: 'text/plain' });
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toBe(blob);
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', data: blob, method: 'POST' });
  });

  it('serializes ArrayBuffer body as-is', async () => {
    const client = createHttpClient(createMockRuntime());
    const buffer = new ArrayBuffer(8);
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toBe(buffer);
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', data: buffer, method: 'POST' });
  });

  it('serializes URLSearchParams body as-is', async () => {
    const client = createHttpClient(createMockRuntime());
    const params = new URLSearchParams({ q: 'test' });
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toBe(params);
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', data: params, method: 'POST' });
  });

  it('serializes plain object to JSON with content-type header', async () => {
    const client = createHttpClient(createMockRuntime());
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('content-type')).toBe('application/json');
      expect(init?.body).toBe('{"name":"test"}');
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', data: { name: 'test' }, method: 'POST' });
  });

  it('serializes array to JSON', async () => {
    const client = createHttpClient(createMockRuntime());
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toBe('[1,2,3]');
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', data: [1, 2, 3], method: 'POST' });
  });

  it('serializes number to JSON', async () => {
    const client = createHttpClient(createMockRuntime());
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toBe('42');
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', data: 42, method: 'POST' });
  });

  it('serializes boolean to JSON', async () => {
    const client = createHttpClient(createMockRuntime());
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toBe('true');
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', data: true, method: 'POST' });
  });

  it('returns null data for empty text response', async () => {
    const client = createHttpClient(createMockRuntime());
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 200, headers: {} })),
    );
    const resp = await client.request({ url: '/test' });
    expect(resp.data).toBeNull();
  });

  it('returns text data for non-JSON content-type', async () => {
    const client = createHttpClient(createMockRuntime());
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('hello world', {
            status: 200,
            headers: { 'content-type': 'text/plain' },
          }),
      ),
    );
    const resp = await client.request({ url: '/test' });
    expect(resp.data).toBe('hello world');
  });

  it('parses response as blob when responseType is blob', async () => {
    const client = createHttpClient(createMockRuntime());
    const blob = new Blob(['data'], { type: 'application/octet-stream' });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(blob, { status: 200 })),
    );
    const resp = await client.request({ url: '/test', responseType: 'blob' });
    expect(resp.data).toBeInstanceOf(Blob);
  });

  it('parses response as text when responseType is text', async () => {
    const client = createHttpClient(createMockRuntime());
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('text-data', { status: 200 })),
    );
    const resp = await client.request({ url: '/test', responseType: 'text' });
    expect(resp.data).toBe('text-data');
  });

  it('uses GET method by default when no data', async () => {
    const client = createHttpClient(createMockRuntime());
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('GET');
      expect(init?.body).toBeUndefined();
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test' });
  });

  it('uses POST method by default when data is provided', async () => {
    const client = createHttpClient(createMockRuntime());
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.method).toBe('POST');
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', data: { a: 1 } });
  });

  it('skips body for GET requests even with data', async () => {
    const client = createHttpClient(createMockRuntime());
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toBeUndefined();
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', method: 'GET', data: { a: 1 } });
  });

  it('skips auth headers when withAuth is false', async () => {
    const client = createHttpClient(createMockRuntime());
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('authorization')).toBeNull();
      expect(headers.get('x-access-token')).toBeNull();
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', withAuth: false });
  });

  it('throws timeout error on abort', async () => {
    const client = createHttpClient(createMockRuntime());
    const fetchMock = vi.fn(async () => {
      const error = new DOMException('The operation was aborted', 'AbortError');
      throw error;
    });
    vi.stubGlobal('fetch', fetchMock);
    await expect(client.request({ url: '/test', timeoutMs: 100 })).rejects.toThrow(
      'Request timed out after 100ms',
    );
  });

  it('throws network error on fetch failure', async () => {
    const client = createHttpClient(createMockRuntime());
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(client.request({ url: '/test' })).rejects.toThrow('Network request failed');
  });

  it('throws unknown error string on non-Error fetch failure', async () => {
    const client = createHttpClient(createMockRuntime());
    vi.stubGlobal('fetch', vi.fn(async () => { throw 'string-error'; }));
    await expect(client.request({ url: '/test' })).rejects.toThrow('Network request failed: Unknown error');
  });

  it('uses runtime getTimeoutMs when provided', async () => {
    const client = createHttpClient({
      ...createMockRuntime(),
      getTimeoutMs: () => 5000,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })),
    );
    const resp = await client.request({ url: '/test' });
    expect(resp.status).toBe(200);
  });

  it('uses getValidToken when available', async () => {
    const client = createHttpClient({
      ...createMockRuntime(),
      getValidToken: async () => 'valid-token',
    });
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('authorization')).toBe('Bearer valid-token');
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test' });
  });

  it('handles 401 refresh failure with clearTokens and onUnauthorized', async () => {
    const onUnauthorized = vi.fn();
    const clearTokens = vi.fn();
    const client = createHttpClient({
      getBaseUrl: () => '',
      getLocale: () => 'en-US',
      getAuthToken: () => 'expired',
      getRefreshToken: () => 'refresh-1',
      refreshAccessToken: async () => { throw new Error('refresh failed'); },
      onUnauthorized,
      clearTokens,
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('unauthorized', {
            status: 401,
            headers: { 'content-type': 'text/plain' },
          }),
      ),
    );

    await expect(client.request({ url: '/secure' })).rejects.toThrow('Token refresh failed');
    expect(clearTokens).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('handles response with +json content-type', async () => {
    const client = createHttpClient(createMockRuntime());
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{"ok":true}', {
            status: 200,
            headers: { 'content-type': 'application/vnd.api+json' },
          }),
      ),
    );
    const resp = await client.request({ url: '/test' });
    expect(resp.data).toMatchObject({ ok: true });
  });

  it('handles null body gracefully', async () => {
    const client = createHttpClient(createMockRuntime());
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.body).toBeUndefined();
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', data: null, method: 'POST' });
  });

  it('normalizes response headers to lowercase', async () => {
    const client = createHttpClient(createMockRuntime());
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response('{}', {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'X-Custom': 'value' },
          }),
      ),
    );
    const resp = await client.request({ url: '/test' });
    expect(resp.headers['content-type']).toBe('application/json');
    expect(resp.headers['x-custom']).toBe('value');
  });

  it('passes custom headers through', async () => {
    const client = createHttpClient(createMockRuntime());
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('x-custom')).toBe('my-value');
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({ url: '/test', headers: { 'x-custom': 'my-value' } });
  });

  it('respects existing content-type header when serializing JSON', async () => {
    const client = createHttpClient(createMockRuntime());
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get('content-type')).toBe('application/vnd.api+json');
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);
    await client.request({
      url: '/test',
      data: { a: 1 },
      method: 'POST',
      headers: { 'content-type': 'application/vnd.api+json' },
    });
  });
});
