import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const requestMock = vi.fn();

vi.mock('../http', () => ({
  mainHttpClient: {
    request: requestMock,
  },
}));

describe('fetchMenuConfig', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    requestMock.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns overridden extension menus with arbitrary icon strings', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'true');
    requestMock.mockResolvedValue({
      status: 200,
      data: {
        home: '/dashboard',
        items: [
          {
            id: 'dashboard',
            titleKey: 'menu.dashboard',
            path: '/dashboard',
            icon: 'layout-dashboard',
            pageType: 'builtin',
            componentId: 'dashboard',
          },
        ],
      },
    });

    const runtime = await import('@nop-chaos/extension-host');

    runtime.setLoadedExtensions([
      {
        source: {
          id: 'example-dms',
          load: async () => ({ default: { id: 'example-dms' } }),
        },
        extension: {
          id: 'example-dms',
          overrideMenus: true,
          menus: [
            {
              id: 'dms-issuer',
              title: 'Issuer',
              path: '/extensions/dms/issuer',
              icon: 'credit-card',
              pageType: 'builtin',
              componentId: 'dms-issuer-worklist',
            },
          ],
        },
      },
    ]);

    const { fetchMenuConfig } = await import('./menu');
    const resultPromise = fetchMenuConfig();

    await vi.runAllTimersAsync();

    await expect(resultPromise).resolves.toMatchObject({
      home: '/extensions/dms/issuer',
      items: [
        {
          id: 'dms-issuer',
          icon: 'credit-card',
        },
      ],
    });

    runtime.setLoadedExtensions([]);
  });
});
