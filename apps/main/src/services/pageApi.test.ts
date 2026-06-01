import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAjaxFetch = vi.fn();
const mockAjaxQuery = vi.fn();
const mockLoadSchemaAsset = vi.fn();
const mockI18n = { language: 'zh-CN' };

vi.mock('./http', () => ({
  ajaxFetch: (...args: unknown[]) => mockAjaxFetch(...args),
  ajaxQuery: (...args: unknown[]) => mockAjaxQuery(...args),
}));

vi.mock('./schemaAsset', () => ({
  loadSchemaAsset: (...args: unknown[]) => mockLoadSchemaAsset(...args),
}));

vi.mock('../config/i18n', () => ({
  default: mockI18n,
}));

vi.mock('../config/i18n/languages', async () => {
  const actual = await vi.importActual<typeof import('../config/i18n/languages')>('../config/i18n/languages');
  return actual;
});

describe('pageApi', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    mockI18n.language = 'zh-CN';
    mockAjaxFetch.mockReset();
    mockAjaxQuery.mockReset();
    mockLoadSchemaAsset.mockReset();

    const { clearAmisPageCache } = await import('./pageApi');
    clearAmisPageCache();
  });

  it('caches backend page queries by locale and path', async () => {
    mockAjaxQuery.mockResolvedValue({ type: 'page', body: [{ type: 'tpl', tpl: 'hello' }] });
    const { fetchAmisPage } = await import('./pageApi');

    const first = await fetchAmisPage('/pages/demo.page.yaml');
    const second = await fetchAmisPage('/pages/demo.page.yaml');

    expect(mockAjaxQuery).toHaveBeenCalledTimes(1);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
  });

  it('separates cached pages by locale', async () => {
    mockAjaxQuery.mockResolvedValue({ type: 'page', body: [{ type: 'tpl', tpl: 'hello' }] });
    const { fetchAmisPage } = await import('./pageApi');

    await fetchAmisPage('/pages/demo.page.yaml');
    mockI18n.language = 'en-US';
    await fetchAmisPage('/pages/demo.page.yaml');

    expect(mockAjaxQuery).toHaveBeenCalledTimes(2);
  });

  it('does not keep failed backend queries in cache', async () => {
    mockAjaxQuery.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ type: 'page' });
    const { fetchAmisPage } = await import('./pageApi');

    await expect(fetchAmisPage('/pages/demo.page.yaml')).rejects.toThrow('boom');
    await expect(fetchAmisPage('/pages/demo.page.yaml')).resolves.toEqual({ type: 'page' });

    expect(mockAjaxQuery).toHaveBeenCalledTimes(2);
  });

  it('caches direct /p page fetches', async () => {
    mockAjaxFetch.mockResolvedValue({ type: 'page', body: [] });
    const { fetchAmisPage } = await import('./pageApi');

    await fetchAmisPage('/p/demo.page.yaml');
    await fetchAmisPage('/p/demo.page.yaml');

    expect(mockAjaxFetch).toHaveBeenCalledTimes(1);
    expect(mockAjaxFetch).toHaveBeenCalledWith('/p/demo.page.yaml', { method: 'GET' });
  });

  it('caches static schema asset loads', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'false');
    mockLoadSchemaAsset.mockResolvedValue({ type: 'page', body: [] });
    const { fetchAmisPage } = await import('./pageApi');

    await fetchAmisPage('/assets/demo.json');
    await fetchAmisPage('/assets/demo.json');

    expect(mockLoadSchemaAsset).toHaveBeenCalledTimes(1);
  });
});
