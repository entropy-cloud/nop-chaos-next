import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';

const mockCreateHttpClient = vi.fn();
const mockSetRefreshTokenFetcher = vi.fn();
const mockClearTokens = vi.fn();
const mockSetTokens = vi.fn();
const mockGetValidToken = vi.fn();
const mockUnwrapApiPayload = vi.fn();
const mockGetAccessToken = vi.fn();
const mockGetRefreshToken = vi.fn();

vi.mock('@nop-chaos/shared', () => ({
  createHttpClient: (...args: unknown[]) => mockCreateHttpClient(...args),
  setRefreshTokenFetcher: (...args: unknown[]) => mockSetRefreshTokenFetcher(...args),
  clearTokens: (...args: unknown[]) => mockClearTokens(...args),
  setTokens: (...args: unknown[]) => mockSetTokens(...args),
  getAccessToken: (...args: unknown[]) => mockGetAccessToken(...args),
  getRefreshToken: (...args: unknown[]) => mockGetRefreshToken(...args),
  getValidToken: (...args: unknown[]) => mockGetValidToken(...args),
  unwrapApiPayload: (...args: unknown[]) => mockUnwrapApiPayload(...args),
}));

const mockRefreshAccessToken = vi.fn();

vi.mock('./authApi', () => ({
  refreshAccessToken: (...args: unknown[]) => mockRefreshAccessToken(...args),
}));

vi.mock('../config/i18n/languages', () => ({
  normalizeLanguageCode: (lang: string) => lang,
}));

vi.mock('../config/i18n', () => ({
  default: { language: 'en' },
}));

describe('http', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let capturedConfig: any;

  beforeEach(() => {
    mockCreateHttpClient.mockReset();
    mockClearTokens.mockReset();
    mockSetTokens.mockReset();
    mockGetValidToken.mockReset();
    mockUnwrapApiPayload.mockReset();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      token: undefined,
      tokens: undefined,
      bootstrapStatus: 'idle',
    });
    mockGetAccessToken.mockReset();
    mockGetRefreshToken.mockReset();
    mockGetAccessToken.mockImplementation(() => useAuthStore.getState().token);
    mockGetRefreshToken.mockImplementation(() => useAuthStore.getState().tokens?.refreshToken);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateHttpClient.mockImplementation((config: any) => {
      capturedConfig = config;
      return {
        request: vi.fn().mockResolvedValue({ status: 200, data: { data: {} } }),
      };
    });
  });

  it('creates http client with config functions', async () => {
    const { mainHttpClient } = await import('./http');

    expect(mockCreateHttpClient).toHaveBeenCalledOnce();
    expect(mainHttpClient).toBeDefined();
    expect(capturedConfig.getTimeoutMs()).toBe(15_000);
  });

  it('getAuthToken reads from managed token storage', async () => {
    await import('./http');
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('my-auth-token');

    const token = capturedConfig.getAuthToken();
    expect(token).toBe('my-auth-token');
  });

  it('getRefreshToken reads from managed token storage', async () => {
    await import('./http');
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('tok', 'rt-456', 3600, 86400);

    const rt = capturedConfig.getRefreshToken();
    expect(rt).toBe('rt-456');
  });

  it('getRefreshToken returns undefined when no tokens', async () => {
    await import('./http');
    expect(capturedConfig.getRefreshToken()).toBeUndefined();
  });

  it('refreshAccessToken throws when no refresh token', async () => {
    await import('./http');
    await expect(capturedConfig.refreshAccessToken()).rejects.toThrow('No refresh token available');
  });

  it('refreshAccessToken refreshes and syncs tokens', async () => {
    await import('./http');
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('old', 'rt-old', 60, 3600);
    mockRefreshAccessToken.mockResolvedValue({
      accessToken: 'new-access',
      expiresIn: 300,
      refreshToken: 'new-rt',
      refreshExpiresIn: 86400,
    });

    const result = await capturedConfig.refreshAccessToken();

    expect(result).toBe('new-access');
    expect(useAuthStore.getState().token).toBe('new-access');
  });

  it('setAuthToken sets token in store when provided', async () => {
    await import('./http');
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('old');

    capturedConfig.setAuthToken('new-tok');
    expect(useAuthStore.getState().token).toBe('new-tok');
  });

  it('setAuthToken does nothing when token is falsy', async () => {
    await import('./http');
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('old');

    capturedConfig.setAuthToken('');
    expect(useAuthStore.getState().token).toBe('old');
  });

  it('clearTokens clears managed tokens and store', async () => {
    await import('./http');
    useAuthStore.getState().setUser({ id: '1', username: 'test', roles: [] });
    useAuthStore.getState().setTokens('tok');

    capturedConfig.clearTokens();
    expect(mockClearTokens).toHaveBeenCalledOnce();
    expect(useAuthStore.getState().token).toBeUndefined();
  });

  it('onUnauthorized clears tokens and logs out', async () => {
    await import('./http');
    useAuthStore.getState().login({
      user: { id: '1', username: 'test', roles: [] },
      token: 'tok',
      tokens: { accessToken: 'tok' },
    });

    capturedConfig.onUnauthorized();

    expect(mockClearTokens).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().bootstrapStatus).toBe('anonymous');
  });

  it('getLocale delegates to normalizeLanguageCode', async () => {
    await import('./http');
    const locale = capturedConfig.getLocale();
    expect(typeof locale).toBe('string');
  });

  it('getBaseUrl returns empty string by default', async () => {
    await import('./http');
    const url = capturedConfig.getBaseUrl();
    expect(typeof url).toBe('string');
  });

  it('setRefreshTokenFetcher is called on module load', async () => {
    // vitest 5 clears mock call records between tests, so re-execute the
    // module body to observe the module-load side effect. This test must stay
    // LAST in the file: resetModules() creates a fresh http module instance,
    // which would invalidate `capturedConfig` for any test that follows.
    vi.resetModules();
    await import('./http');
    expect(mockSetRefreshTokenFetcher).toHaveBeenCalled();
  });

  // ── nopRpcRequest 透传分支 blob 处理（plan 2026-10-06-0508-1，flux download Form 1 契约）──

  it('passthrough blob: 2xx non-JSON Blob returned as-is with responseType forwarded', async () => {
    const { mainHttpClient, nopRpcRequest } = await import('./http');
    const blob = new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const requestSpy = vi.fn().mockResolvedValue({
      status: 200,
      data: blob,
      headers: { 'content-disposition': 'attachment; filename="a.xlsx"' },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mainHttpClient as any).request = requestSpy;

    const resp = await nopRpcRequest({
      url: '/p/ErpCrmReport__download',
      method: 'post',
      responseType: 'blob',
    });

    expect(requestSpy.mock.calls[0][0].responseType).toBe('blob');
    expect(resp.status).toBe(0);
    expect(resp.data).toBe(blob);
    expect(resp.headers?.['content-disposition']).toContain('a.xlsx');
  });

  it('passthrough blob: JSON error envelope is not returned as a fake download', async () => {
    const { mainHttpClient, nopRpcRequest } = await import('./http');
    const blob = new Blob([JSON.stringify({ status: -1, msg: 'bad report param' })], {
      type: 'application/json',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mainHttpClient as any).request = vi.fn().mockResolvedValue({ status: 200, data: blob, headers: {} });

    const resp = await nopRpcRequest({
      url: '/p/ErpCrmReport__download',
      method: 'post',
      responseType: 'blob',
    });

    expect(resp.status).toBe(-1);
    expect(resp.msg).toBe('bad report param');
    expect(resp.data).toBeNull();
  });

  it('passthrough blob: non-2xx binary maps to status -1 (no fake success)', async () => {
    const { mainHttpClient, nopRpcRequest } = await import('./http');
    const blob = new Blob([new Uint8Array([0x00])], { type: 'application/octet-stream' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mainHttpClient as any).request = vi.fn().mockResolvedValue({ status: 500, data: blob, headers: {} });

    const resp = await nopRpcRequest({
      url: '/p/ErpCrmReport__download',
      method: 'post',
      responseType: 'blob',
    });

    expect(resp.status).toBe(-1);
    expect(resp.data).toBeNull();
  });

  it('passthrough without responseType keeps legacy envelope behavior', async () => {
    const { mainHttpClient, nopRpcRequest } = await import('./http');
    const requestSpy = vi.fn().mockResolvedValue({
      status: 200,
      data: { status: 0, data: { x: 1 } },
      headers: {},
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mainHttpClient as any).request = requestSpy;

    const resp = await nopRpcRequest({ url: '/p/some-endpoint', method: 'post' });

    expect(requestSpy.mock.calls[0][0].responseType).toBeUndefined();
    expect(resp.status).toBe(0);
    expect(resp.data).toEqual({ x: 1 });
  });
});
