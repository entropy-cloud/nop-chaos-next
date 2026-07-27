import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockNopRpcRequest = vi.fn();

vi.mock('../services/http', () => ({
  nopRpcRequest: (...args: unknown[]) => mockNopRpcRequest(...args),
}));

describe('fetchFluxDict', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    mockNopRpcRequest.mockReset();
  });

  it('returns mock role dict when mock mode is enabled', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'true');
    const { fetchFluxDict } = await import('./providers');

    const result = await fetchFluxDict('role');

    expect(result).toEqual({
      name: 'role',
      options: [
        { label: '管理员', value: 'admin' },
        { label: '用户', value: 'user' },
        { label: '访客', value: 'guest' },
      ],
    });
  });

  it('returns mock status dict when mock mode is enabled', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'true');
    const { fetchFluxDict } = await import('./providers');

    const result = await fetchFluxDict('status');

    expect(result).toEqual({
      name: 'status',
      options: [
        { label: '启用', value: 'active' },
        { label: '禁用', value: 'disabled' },
      ],
    });
  });

  it('returns empty options for unknown dict name in mock mode', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'true');
    const { fetchFluxDict } = await import('./providers');

    const result = await fetchFluxDict('nonexistent');

    expect(result).toEqual({ name: 'nonexistent', options: [] });
  });

  it('calls nopRpcRequest with correct REST RPC endpoint in production mode', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'false');
    mockNopRpcRequest.mockResolvedValue({
      ok: true,
      data: {
        name: 'role',
        options: [{ label: 'Admin', value: 'admin' }],
      },
    });
    const { fetchFluxDict } = await import('./providers');

    const result = await fetchFluxDict('role');

    expect(mockNopRpcRequest).toHaveBeenCalledWith({
      url: '@query:DictProvider__getDict',
      data: { dictName: 'role' },
      signal: undefined,
    });
    expect(result).toEqual({
      name: 'role',
      options: [{ label: 'Admin', value: 'admin' }],
    });
  });

  it('rejects when signal is already aborted', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'false');
    const { fetchFluxDict } = await import('./providers');

    const controller = new AbortController();
    controller.abort(new Error('Cancelled by test'));

    await expect(fetchFluxDict('role', controller.signal)).rejects.toThrow('Cancelled by test');
    expect(mockNopRpcRequest).not.toHaveBeenCalled();
  });
});
