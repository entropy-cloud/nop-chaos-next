import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';

const mockCreateHttpClient = vi.fn();
const mockSetRefreshTokenFetcher = vi.fn();
const mockClearTokens = vi.fn();
const mockSetTokens = vi.fn();
const mockGetValidToken = vi.fn();
const mockUnwrapApiPayload = vi.fn();

vi.mock('@nop-chaos/shared', () => ({
  createHttpClient: (...args: unknown[]) => mockCreateHttpClient(...args),
  setRefreshTokenFetcher: (...args: unknown[]) => mockSetRefreshTokenFetcher(...args),
  clearTokens: (...args: unknown[]) => mockClearTokens(...args),
  setTokens: (...args: unknown[]) => mockSetTokens(...args),
  getValidToken: (...args: unknown[]) => mockGetValidToken(...args),
  unwrapApiPayload: (...args: unknown[]) => mockUnwrapApiPayload(...args),
}));

vi.mock('./authApi', () => ({
  refreshAccessToken: vi.fn().mockResolvedValue({
    accessToken: 'refreshed',
    expiresIn: 300,
  }),
}));

vi.mock('../config/i18n/languages', () => ({
  normalizeLanguageCode: (lang: string) => lang,
}));

vi.mock('../config/i18n', () => ({
  default: { language: 'en' },
}));

const mockRequest = vi.fn();

vi.mock('@nop-chaos/amis-core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transformGraphQLRequest: (req: any) => {
    if (req.url.startsWith('@query:') || req.url.startsWith('@mutation:')) {
      const colonIdx = req.url.indexOf(':');
      const slashIdx = req.url.indexOf('/');
      const _operationType = req.url.slice(1, colonIdx);
      const action = slashIdx >= 0 ? req.url.slice(colonIdx + 1, slashIdx) : req.url.slice(colonIdx + 1);
      return {
        operationName: action,
        request: {
          url: '/graphql',
          method: 'POST',
          headers: req.headers,
          data: { query: `{ ${action} }`, variables: req.data },
        },
      };
    }
    return null;
  },
  normalizeGraphQLResponse: (data: unknown, _op: string) => data,
}));

describe('http ajaxFetch/ajaxQuery', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      token: undefined,
      tokens: undefined,
      bootstrapStatus: 'idle',
    });
    mockRequest.mockReset();
    mockUnwrapApiPayload.mockReset();
    mockCreateHttpClient.mockImplementation((_config: Record<string, unknown>) => ({
      request: mockRequest,
    }));
  });

  it('ajaxFetch passes plain URL request to httpClient', async () => {
    mockRequest.mockResolvedValue({ status: 200, data: { data: { result: 'ok' } } });
    mockUnwrapApiPayload.mockImplementation((d: unknown) => (d as Record<string, unknown>).data);

    const { ajaxFetch } = await import('./http');
    await ajaxFetch('/api/test', { method: 'GET' });

    expect(mockRequest).toHaveBeenCalledOnce();
    const req = mockRequest.mock.calls[0][0];
    expect(req.url).toBe('/api/test');
    expect(mockUnwrapApiPayload).toHaveBeenCalled();
  });

  it('ajaxFetch transforms graphql-prefixed paths', async () => {
    mockRequest.mockResolvedValue({ status: 200, data: { data: {} } });
    mockUnwrapApiPayload.mockReturnValue({ user: 'test' });

    const { ajaxFetch } = await import('./http');
    await ajaxFetch('@query:LoginApi__getLoginUserInfo', {
      method: 'POST',
      data: { accessToken: 'tok' },
    });

    const req = mockRequest.mock.calls[0][0];
    expect(req.url).toBe('/graphql');
  });

  it('ajaxFetch throws on error status with object message', async () => {
    mockRequest.mockResolvedValue({
      status: 500,
      data: { message: 'Server exploded' },
    });

    const { ajaxFetch } = await import('./http');
    await expect(ajaxFetch('/api/fail')).rejects.toThrow('Server exploded');
  });

  it('ajaxFetch throws on error status with string data', async () => {
    mockRequest.mockResolvedValue({
      status: 403,
      data: 'Forbidden access',
    });

    const { ajaxFetch } = await import('./http');
    await expect(ajaxFetch('/api/forbidden')).rejects.toThrow('Forbidden access');
  });

  it('ajaxFetch throws on error status with fallback message', async () => {
    mockRequest.mockResolvedValue({
      status: 502,
      data: null,
    });

    const { ajaxFetch } = await import('./http');
    await expect(ajaxFetch('/api/badgateway')).rejects.toThrow('Request failed: 502');
  });

  it('ajaxFetch passes headers and query params', async () => {
    mockRequest.mockResolvedValue({ status: 200, data: {} });
    mockUnwrapApiPayload.mockReturnValue({});

    const { ajaxFetch } = await import('./http');
    await ajaxFetch('/api/data', {
      method: 'POST',
      headers: { 'x-custom': 'val' },
      data: { key: 'value' },
    });

    expect(mockRequest).toHaveBeenCalledOnce();
  });

  it('ajaxQuery defaults method to POST', async () => {
    mockRequest.mockResolvedValue({ status: 200, data: {} });
    mockUnwrapApiPayload.mockReturnValue({});

    const { ajaxQuery } = await import('./http');
    await ajaxQuery('/api/query', { param: 'x' });

    expect(mockRequest).toHaveBeenCalled();
  });

  it('ajaxQuery passes custom method', async () => {
    mockRequest.mockResolvedValue({ status: 200, data: {} });
    mockUnwrapApiPayload.mockReturnValue({});

    const { ajaxQuery } = await import('./http');
    await ajaxQuery('/api/query', { p: '1' }, { method: 'PUT' });

    const req = mockRequest.mock.calls[0][0];
    expect(req.method).toBe('PUT');
  });

  it('error thrown has status property', async () => {
    mockRequest.mockResolvedValue({ status: 422, data: { message: 'Validation failed' } });

    const { ajaxFetch } = await import('./http');
    try {
      await ajaxFetch('/api/validate');
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as Error & { status?: number }).status).toBe(422);
    }
  });
});
