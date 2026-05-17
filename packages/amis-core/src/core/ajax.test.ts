import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerAmisRuntimeAdapter } from '../adapter';
import { createAmisPageObject } from '../page/page';
import { fetchAmisRequest } from './ajax';

function createTestAdapter(overrides: Record<string, unknown> = {}) {
  return {
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
    getThemeConfig: () => ({ themeId: 'classic', displayMode: 'light' as const }),
    navigate: () => undefined,
    isCurrentUrl: () => false,
    notify: () => undefined,
    alert: async () => undefined,
    confirm: async () => true,
    logout: () => undefined,
    pageProvider: { getPage: async () => ({}) },
    dictProvider: {
      getDict: async () => ({ status: 200, data: { status: 0, msg: '', data: [] }, headers: {} }),
    },
    ...overrides,
  };
}

function mockFetchResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return vi.fn(async () => {
    if (typeof body === 'string') {
      return new Response(body, { status, headers });
    }
    if (body instanceof Blob) {
      return new Response(body, { status, headers });
    }
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...headers },
    });
  });
}

describe('handleSpecialRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    registerAmisRuntimeAdapter(createTestAdapter());
  });

  it('handles action:// prefix and returns action result', async () => {
    const page = createAmisPageObject();
    const actionFn = vi.fn(() => 'action-result');
    page.registerAction('myAction', actionFn);

    const result = await fetchAmisRequest({
      url: 'action://myAction',
      _page: page,
    });

    expect(result.data).toMatchObject({ status: 0, data: 'action-result' });
  });

  it('handles action:// prefix with fetcher-like result', async () => {
    const page = createAmisPageObject();
    const fetcherResult = { status: 200, data: { status: 0, msg: '', data: 'direct' }, headers: {} };
    page.registerAction('fetchAction', () => fetcherResult);

    const result = await fetchAmisRequest({
      url: 'action://fetchAction',
      _page: page,
    });

    expect(result).toBe(fetcherResult);
  });

  it('throws for unknown action', async () => {
    const page = createAmisPageObject();

    await expect(
      fetchAmisRequest({
        url: 'action://unknownAction',
        _page: page,
      }),
    ).rejects.toThrow('Unknown amis action: unknownAction');
  });

  it('handles dict:// prefix', async () => {
    const getDict = vi.fn(async () => ({
      status: 200,
      data: { status: 0, msg: '', data: [{ label: 'A', value: 'a' }] },
      headers: {},
    }));
    registerAmisRuntimeAdapter(createTestAdapter({ dictProvider: { getDict } }));

    const result = await fetchAmisRequest({ url: 'dict://myDict' });
    expect(getDict).toHaveBeenCalledWith('myDict', expect.anything());
    expect(result.data).toMatchObject({ data: [{ label: 'A', value: 'a' }] });
  });

  it('handles page:// prefix', async () => {
    const getPage = vi.fn(async () => ({ type: 'page', body: 'hello' }));
    registerAmisRuntimeAdapter(createTestAdapter({ pageProvider: { getPage } }));

    const result = await fetchAmisRequest({ url: 'page:///pages/test.page.json' });
    expect(getPage).toHaveBeenCalledWith('/pages/test.page.json');
    expect(result.data).toMatchObject({ data: { type: 'page', body: 'hello' } });
  });

  it('wraps null action result in success response', async () => {
    const page = createAmisPageObject();
    page.registerAction('returnNull', () => null);

    const result = await fetchAmisRequest({
      url: 'action://returnNull',
      _page: page,
    });

    expect(result).toMatchObject({
      status: 200,
      data: { status: 0, msg: '', data: null },
    });
  });
});

describe('notifyResult', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows error toast for non-zero status via action', async () => {
    const notify = vi.fn();
    registerAmisRuntimeAdapter(createTestAdapter({ notify }));
    const page = createAmisPageObject();
    page.registerAction('fail', () => ({
      status: 200,
      data: { status: -1, msg: 'something failed', data: null },
      headers: {},
    }));

    await fetchAmisRequest({ url: 'action://fail', _page: page });
    expect(notify).toHaveBeenCalledWith('error', 'something failed');
  });

  it('shows info toast for zero status with msg via action', async () => {
    const notify = vi.fn();
    registerAmisRuntimeAdapter(createTestAdapter({ notify }));
    const page = createAmisPageObject();
    page.registerAction('ok', () => ({
      status: 200,
      data: { status: 0, msg: 'success msg', data: null },
      headers: {},
    }));

    await fetchAmisRequest({ url: 'action://ok', _page: page });
    expect(notify).toHaveBeenCalledWith('info', 'success msg');
  });

  it('skips notification when silent option is set', async () => {
    const notify = vi.fn();
    registerAmisRuntimeAdapter(createTestAdapter({ notify }));
    const page = createAmisPageObject();
    page.registerAction('fail', () => ({
      status: 200,
      data: { status: -1, msg: 'error', data: null },
      headers: {},
    }));

    await fetchAmisRequest({ url: 'action://fail', _page: page, silent: true });
    expect(notify).not.toHaveBeenCalled();
  });

  it('uses alert when useAlert option is set', async () => {
    const alert = vi.fn(async () => undefined);
    const notify = vi.fn();
    registerAmisRuntimeAdapter(createTestAdapter({ alert, notify }));
    const page = createAmisPageObject();
    page.registerAction('fail', () => ({
      status: 200,
      data: { status: -1, msg: 'alert me', data: null },
      headers: {},
    }));

    await fetchAmisRequest({ url: 'action://fail', _page: page, useAlert: true });
    expect(alert).toHaveBeenCalledWith('alert me');
    expect(notify).not.toHaveBeenCalled();
  });

  it('skips notification when msg is empty', async () => {
    const notify = vi.fn();
    registerAmisRuntimeAdapter(createTestAdapter({ notify }));
    const page = createAmisPageObject();
    page.registerAction('ok', () => ({
      status: 200,
      data: { status: 0, msg: '', data: null },
      headers: {},
    }));

    await fetchAmisRequest({ url: 'action://ok', _page: page });
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('handleLogout on 401', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls logout on 401 response', async () => {
    const logout = vi.fn();
    const setAuthToken = vi.fn();
    const request = vi.fn(async () => ({
      status: 401,
      headers: { 'content-type': 'application/json' },
      data: { status: 401, msg: 'unauthorized', data: null },
    }));
    registerAmisRuntimeAdapter(
      createTestAdapter({ logout, setAuthToken, getAuthToken: () => 'token', request }),
    );

    await fetchAmisRequest({ url: '/demo' });
    expect(setAuthToken).toHaveBeenCalledWith(undefined);
    expect(logout).toHaveBeenCalledWith('401');
  });
});

describe('rawResponse mode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wraps raw response data in api payload', async () => {
    const request = vi.fn(async () => ({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { id: 1, name: 'test' },
    }));
    registerAmisRuntimeAdapter(createTestAdapter({ request }));

    const result = await fetchAmisRequest({ url: '/demo', rawResponse: true });
    expect(result.data).toMatchObject({
      status: 0,
      msg: '',
      data: { id: 1, name: 'test' },
    });
  });
});

describe('responseKey mode', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('restructures response using responseKey', async () => {
    const request = vi.fn(async () => ({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: { status: 0, msg: '', data: { rows: [1, 2] } },
    }));
    registerAmisRuntimeAdapter(createTestAdapter({ request }));

    const result = await fetchAmisRequest({ url: '/demo', responseKey: 'items' });
    expect(result.data).toEqual({ items: { rows: [1, 2] } });
  });
});

describe('network error handling via adapter.request', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('handles generic Error from adapter.request', async () => {
    const request = vi.fn(async () => {
      throw new Error('timeout');
    });
    registerAmisRuntimeAdapter(createTestAdapter({ request }));

    const result = await fetchAmisRequest({ url: '/demo' });
    expect(result).toMatchObject({
      status: 0,
      data: { status: -1, msg: 'The request failed, please try again later' },
    });
  });

  it('handles non-Error throws from adapter.request', async () => {
    const request = vi.fn(async () => {
      throw 'string error';
    });
    registerAmisRuntimeAdapter(createTestAdapter({ request }));

    const result = await fetchAmisRequest({ url: '/demo' });
    expect(result).toMatchObject({
      status: 0,
      data: { status: -1 },
    });
  });

  it('re-throws DOMException AbortError from adapter.request', async () => {
    const request = vi.fn(async () => {
      throw new DOMException('The operation was aborted', 'AbortError');
    });
    registerAmisRuntimeAdapter(createTestAdapter({ request }));

    await expect(fetchAmisRequest({ url: '/demo' })).rejects.toThrow('The operation was aborted');
  });

  it('maps Failed to fetch error to network exception message', async () => {
    const request = vi.fn(async () => {
      throw new Error('Failed to fetch data');
    });
    registerAmisRuntimeAdapter(createTestAdapter({ request }));

    const result = await fetchAmisRequest({ url: '/demo' });
    expect(result).toMatchObject({
      status: 0,
      data: { status: -1, msg: 'Network exception, please check your connection' },
    });
  });
});

describe('non-ok http status handling via adapter.request', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps 500 status to error message', async () => {
    const request = vi.fn(async () => ({
      status: 500,
      headers: { 'content-type': 'text/plain' },
      data: 'server error',
    }));
    registerAmisRuntimeAdapter(createTestAdapter({ request }));

    const result = await fetchAmisRequest({ url: '/demo' });
    expect(result).toMatchObject({
      status: 500,
      data: { status: -1, msg: 'Internal server error' },
    });
  });
});

describe('blob response handling via adapter.request', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('downloads blob with attachment content-disposition', async () => {
    const blob = new Blob(['file content'], { type: 'application/octet-stream' });
    const origURL = globalThis.URL;
    const createObjectURL = vi.fn(() => 'blob:test');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...origURL, createObjectURL, revokeObjectURL });

    const request = vi.fn(async () => ({
      status: 200,
      headers: {
        'content-type': 'application/octet-stream',
        'content-disposition': 'attachment; filename="test.csv"',
      },
      data: blob,
    }));
    registerAmisRuntimeAdapter(createTestAdapter({ request }));

    const result = await fetchAmisRequest({ url: '/download', responseType: 'blob' });
    expect(result.data).toMatchObject({ status: 0 });
  });

  it('parses blob with json content-type back to object', async () => {
    const blob = new Blob([JSON.stringify({ status: 0, msg: 'ok', data: { id: 1 } })], {
      type: 'application/json',
    });
    const request = vi.fn(async () => ({
      status: 200,
      headers: { 'content-type': 'application/json' },
      data: blob,
    }));
    registerAmisRuntimeAdapter(createTestAdapter({ request }));

    const result = await fetchAmisRequest({ url: '/demo', responseType: 'blob' });
    expect(result.data).toMatchObject({ status: 0, msg: 'ok', data: { id: 1 } });
  });

  it('returns blob as-is for non-attachment non-json', async () => {
    const blob = new Blob(['raw data'], { type: 'image/png' });
    const request = vi.fn(async () => ({
      status: 200,
      headers: { 'content-type': 'image/png' },
      data: blob,
    }));
    registerAmisRuntimeAdapter(createTestAdapter({ request }));

    const result = await fetchAmisRequest({ url: '/image', responseType: 'blob' });
    expect(result.data).toBe(blob);
  });
});

describe('processResponse hook', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('passes task through processResponse when provided', async () => {
    const processResponse = vi.fn(<T>(task: Promise<T>) => task);
    registerAmisRuntimeAdapter(createTestAdapter({ processResponse }));
    const page = createAmisPageObject();
    page.registerAction('hook', () => 'ok');

    const result = await fetchAmisRequest({ url: 'action://hook', _page: page });
    expect(processResponse).toHaveBeenCalledTimes(1);
    expect(result.data).toMatchObject({ data: 'ok' });
  });
});

describe('fetchAmisRequest', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    registerAmisRuntimeAdapter(createTestAdapter());
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
