import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../store/authStore';

const mockAjaxFetch = vi.fn();
const mockMapLegacy = vi.fn();
const mockMergeBuiltin = vi.fn();
const mockFetchMockMenu = vi.fn();

vi.mock('./http', () => ({
  ajaxFetch: (...args: unknown[]) => mockAjaxFetch(...args),
}));

vi.mock('./menuMapper', () => ({
  mapLegacySiteMapToMenuResponse: (...args: unknown[]) => mockMapLegacy(...args),
}));

vi.mock('../config/systemMenus', () => ({
  mergeBuiltinSystemMenus: (...args: unknown[]) => mockMergeBuiltin(...args),
}));

vi.mock('./mockApi', () => ({
  fetchMenuConfig: (...args: unknown[]) => mockFetchMockMenu(...args),
}));

describe('menuApi', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      token: undefined,
      tokens: undefined,
      bootstrapStatus: 'idle',
    });
    mockAjaxFetch.mockReset();
    mockMapLegacy.mockReset();
    mockMergeBuiltin.mockReset();
    mockFetchMockMenu.mockReset();
  });

  it('uses mock flow when mock mode is enabled', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'true');
    const mockMenu = { home: '/', items: [] };
    const mergedMenu = { home: '/', items: [{ id: 'sys' }] };
    mockFetchMockMenu.mockResolvedValue(mockMenu);
    mockMergeBuiltin.mockReturnValue(mergedMenu);

    const { fetchMenuConfig } = await import('./menuApi');
    const result = await fetchMenuConfig();

    expect(mockFetchMockMenu).toHaveBeenCalledOnce();
    expect(mockMergeBuiltin).toHaveBeenCalledWith(mockMenu);
    expect(result).toEqual(mergedMenu);
    expect(mockAjaxFetch).not.toHaveBeenCalled();
  });

  it('fetches from backend with auth headers when token exists', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'false');
    useAuthStore.setState({ token: 'my-token' });
    const legacyPayload = { resources: [] };
    const mappedMenu = { home: '/', items: [] };
    const mergedMenu = { home: '/', items: [{ id: 'sys' }] };

    mockAjaxFetch.mockResolvedValue(legacyPayload);
    mockMapLegacy.mockReturnValue(mappedMenu);
    mockMergeBuiltin.mockReturnValue(mergedMenu);

    const { fetchMenuConfig } = await import('./menuApi');
    const result = await fetchMenuConfig();

    expect(mockAjaxFetch).toHaveBeenCalledOnce();
    const fetchOptions = mockAjaxFetch.mock.calls[0][1];
    expect(fetchOptions.headers).toEqual({
      'x-access-token': 'my-token',
      authorization: 'Bearer my-token',
    });
    expect(mockMapLegacy).toHaveBeenCalledWith(legacyPayload);
    expect(mockMergeBuiltin).toHaveBeenCalledWith(mappedMenu);
    expect(result).toEqual(mergedMenu);
  });

  it('fetches from backend without auth headers when no token', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'false');
    mockAjaxFetch.mockResolvedValue({ resources: [] });
    mockMapLegacy.mockReturnValue({ home: '/', items: [] });
    mockMergeBuiltin.mockImplementation((v: unknown) => v);

    const { fetchMenuConfig } = await import('./menuApi');
    await fetchMenuConfig();

    const fetchOptions = mockAjaxFetch.mock.calls[0][1];
    expect(fetchOptions.headers).toBeUndefined();
  });
});
