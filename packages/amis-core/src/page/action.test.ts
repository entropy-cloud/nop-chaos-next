import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerAmisRuntimeAdapter } from '../adapter';
import { createMockAdapter } from '../test-helpers/mockAdapter';
import { bindActions } from './action';
import { createAmisPageObject } from './page';

describe('bindActions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubSameOrigin() {
    vi.stubGlobal('window', {
      location: {
        origin: 'https://example.com',
      },
    });
  }

  it('converts @action strings into action urls', async () => {
    const page = createAmisPageObject('mock://preview');

    registerAmisRuntimeAdapter(
      createMockAdapter({
        resolveAction: (name: string) => (name === 'preview.notify' ? () => 'ok' : undefined),
      }),
    );

    const bound = await bindActions(
      {
        type: 'button',
        api: '@action:preview.notify',
      },
      page,
    );

    expect(bound).toMatchObject({ api: 'action://preview.notify' });
    expect(page.getAction('preview.notify')).toBeTypeOf('function');
  });

  it('converts graphql prefix urls into scheme urls', async () => {
    const page = createAmisPageObject('mock://preview');

    registerAmisRuntimeAdapter(createMockAdapter());

    const bound = await bindActions(
      {
        api: '@query:PageProvider__getPage',
      },
      page,
    );

    expect(bound).toMatchObject({ api: 'query://PageProvider__getPage' });
  });

  it('loads imported system modules and resolves scoped actions', async () => {
    stubSameOrigin();
    const page = createAmisPageObject('https://example.com/schema/demo.json');

    registerAmisRuntimeAdapter(createMockAdapter());

    const systemImport = vi.fn(async () => ({
      notify: () => 'from-import',
    }));

    vi.stubGlobal('System', {
      import: systemImport,
    });

    const bound = await bindActions(
      {
        'xui:import': './actions.system.js',
        api: '@action:actions.notify',
      },
      page,
    );

    expect(bound).toMatchObject({ api: 'action://actions.notify' });
    expect(page.getAction('actions.notify')?.()).toBe('from-import');
    expect(systemImport).toHaveBeenCalledWith('https://example.com/schema/actions.system.js');
  });

  it('rejects protocol-based xui:import module paths', async () => {
    stubSameOrigin();
    const page = createAmisPageObject('https://example.com/schema/demo.json');

    registerAmisRuntimeAdapter(createMockAdapter());

    await expect(
      bindActions(
        {
          'xui:import': {
            previewLib: 'https://example.com/actions.js',
          },
          api: '@action:previewLib.notify',
        },
        page,
      ),
    ).rejects.toThrow('Only relative same-origin paths are allowed: https://example.com/actions.js');
  });

  it('rejects data url xui:import module paths', async () => {
    stubSameOrigin();
    const page = createAmisPageObject('https://example.com/schema/demo.json');

    registerAmisRuntimeAdapter(createMockAdapter());

    await expect(
      bindActions(
        {
          'xui:import': {
            previewLib: 'data:text/javascript,export const notify = () => true',
          },
          api: '@action:previewLib.notify',
        },
        page,
      ),
    ).rejects.toThrow(
      'Only relative same-origin paths are allowed: data:text/javascript,export const notify = () => true',
    );
  });

  it('stops parent scoped lookup at standalone import boundaries', async () => {
    stubSameOrigin();
    const page = createAmisPageObject('https://example.com/schema/demo.json');

    registerAmisRuntimeAdapter(createMockAdapter());

    const systemImport = vi.fn(async (url: string) => {
      if (url.endsWith('/root-actions.js')) {
        return { root: () => 'root' };
      }

      return { local: () => 'local' };
    });

    vi.stubGlobal('System', {
      import: systemImport,
    });

    await expect(
      bindActions(
        {
          'xui:import': './root-actions.system.js',
          body: {
            'xui:import': './local-actions.system.js',
            'xui:standalone': true,
            api: '@action:root.root',
          },
        },
        page,
      ),
    ).rejects.toThrow('Unknown amis action: root.root');
  });

  it('throws when @fn: syntax is used', async () => {
    const page = createAmisPageObject('mock://preview');

    registerAmisRuntimeAdapter(createMockAdapter());

    await expect(bindActions({ onClick: '@fn:(page) => page.id' }, page)).rejects.toThrow(
      'The @fn: action syntax has been removed. Use @action: with a registered action instead.',
    );
  });
});
