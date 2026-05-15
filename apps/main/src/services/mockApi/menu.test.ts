import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('fetchMenuConfig', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.useFakeTimers();
  });

  it('returns overridden extension menus with arbitrary icon strings', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'true');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
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
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
});
