import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mockI18n = { language: 'zh-CN' };

vi.mock('../config/i18n', () => ({
  default: mockI18n,
}));

vi.mock('../config/i18n/languages', async () => {
  const actual = await vi.importActual<typeof import('../config/i18n/languages')>('../config/i18n/languages');
  return actual;
});

const mockWithPageCache = vi.fn();
const mockWithDictCache = vi.fn();
const mockFetchFluxPage = vi.fn();
const mockFetchFluxDict = vi.fn();
const mockConfirmInApp = vi.fn();
const mockMainHttpClientRequest = vi.fn();

vi.mock('@nop-chaos/ui', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  }),
}));

vi.mock('./cache', () => ({
  withPageCache: (...args: unknown[]) => mockWithPageCache(...args),
  withDictCache: (...args: unknown[]) => mockWithDictCache(...args),
}));

vi.mock('./providers', () => ({
  fetchFluxPage: (...args: unknown[]) => mockFetchFluxPage(...args),
  fetchFluxDict: (...args: unknown[]) => mockFetchFluxDict(...args),
}));

vi.mock('../services/confirm', () => ({
  confirmInApp: (...args: unknown[]) => mockConfirmInApp(...args),
}));

vi.mock('../services/http', () => ({
  mainHttpClient: { request: (...args: unknown[]) => mockMainHttpClientRequest(...args) },
}));

describe('createMainFluxEnv', () => {
  let createMainFluxEnv: typeof import('./adapter')['createMainFluxEnv'];

  beforeAll(async () => {
    const mod = await import('./adapter');
    createMainFluxEnv = mod.createMainFluxEnv;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockI18n.language = 'zh-CN';
  });

  it('sets locale from i18n language at creation time', () => {
    const env = createMainFluxEnv({ navigate: vi.fn() });

    expect(env.locale).toBe('zh-CN');
  });

  it('reflects current i18n language when locale is read at creation time', () => {
    mockI18n.language = 'en-US';
    const env = createMainFluxEnv({ navigate: vi.fn() });

    expect(env.locale).toBe('en-US');
  });

  it('loadPage delegates to withPageCache and fetchFluxPage', async () => {
    const expectedSchema = { type: 'page', body: [{ type: 'tpl', tpl: 'hello' }] };
    mockWithPageCache.mockImplementation((_locale: string, _path: string, loader: () => unknown) => loader());
    mockFetchFluxPage.mockResolvedValue(expectedSchema);

    const env = createMainFluxEnv({ navigate: vi.fn() });
    const result = await env.loadPage!('/mock/test.json');

    expect(result).toBe(expectedSchema);
    expect(mockWithPageCache).toHaveBeenCalledWith(
      'zh-CN',
      '/mock/test.json',
      expect.any(Function),
    );
    expect(mockFetchFluxPage).toHaveBeenCalledWith('/mock/test.json', undefined);
  });

  it('loadDict delegates to withDictCache and fetchFluxDict', async () => {
    const expectedDict = { name: 'role', options: [{ label: 'Admin', value: 'admin' }] };
    mockWithDictCache.mockImplementation((_locale: string, _name: string, loader: () => unknown) => loader());
    mockFetchFluxDict.mockResolvedValue(expectedDict);

    const env = createMainFluxEnv({ navigate: vi.fn() });
    const result = await env.loadDict!('role');

    expect(result).toBe(expectedDict);
    expect(mockWithDictCache).toHaveBeenCalledWith(
      'zh-CN',
      'role',
      expect.any(Function),
    );
    expect(mockFetchFluxDict).toHaveBeenCalledWith('role', undefined);
  });
});
