import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerAmisRuntimeAdapter } from '../adapter';
import { createMockAdapter } from '../test-helpers/mockAdapter';
import type { AmisAction } from '../types';
import { bindActions } from './action';
import { createAmisPageObject } from './page';

function compileTestFunction(code: string, currentPage: unknown): AmisAction {
  return new Function('page', `return (${code})`)(currentPage) as AmisAction;
}

describe('bindActions', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('converts @action strings into action urls', async () => {
    const page = createAmisPageObject('mock://preview');

    registerAmisRuntimeAdapter(
      createMockAdapter({
        resolveAction: (name: string) => (name === 'preview.notify' ? () => 'ok' : undefined),
        compileFunction: compileTestFunction,
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

  it('compiles @fn expressions into callable functions', async () => {
    const page = createAmisPageObject('mock://preview');

    registerAmisRuntimeAdapter(
      createMockAdapter({
        compileFunction: compileTestFunction,
      }),
    );

    const bound = (await bindActions({ onClick: '@fn:(page) => page.id' }, page)) as {
      onClick: AmisAction;
    };

    expect(bound.onClick(page)).toBe(page.id);
  });

  it('converts graphql prefix urls into scheme urls', async () => {
    const page = createAmisPageObject('mock://preview');

    registerAmisRuntimeAdapter(
      createMockAdapter({
        compileFunction: compileTestFunction,
      }),
    );

    const bound = await bindActions(
      {
        api: '@query:PageProvider__getPage',
      },
      page,
    );

    expect(bound).toMatchObject({ api: 'query://PageProvider__getPage' });
  });

  it('lazily resolves actions referenced inside compiled functions', async () => {
    const page = createAmisPageObject('mock://preview');

    registerAmisRuntimeAdapter(
      createMockAdapter({
        resolveAction: (name: string) =>
          name === 'preview.notify' ? () => 'resolved lazily' : undefined,
        compileFunction: compileTestFunction,
      }),
    );

    const bound = (await bindActions(
      { onClick: '@fn:() => page.getAction("preview.notify")?.()' },
      page,
    )) as { onClick: AmisAction };

    expect(bound.onClick()).toBe('resolved lazily');
    expect(page.getAction('preview.notify')).toBeTypeOf('function');
  });

  it('loads imported system modules and resolves scoped actions', async () => {
    const page = createAmisPageObject('https://example.com/schema/demo.json');

    registerAmisRuntimeAdapter(
      createMockAdapter({
        compileFunction: compileTestFunction,
      }),
    );

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

  it('uses native import for non-system imported modules even when System is available', async () => {
    const page = createAmisPageObject('https://example.com/schema/demo.json');

    registerAmisRuntimeAdapter(
      createMockAdapter({
        compileFunction: compileTestFunction,
      }),
    );

    const systemImport = vi.fn(async () => ({
      notify: () => 'from-system',
    }));

    vi.stubGlobal('System', {
      import: systemImport,
    });

    const bound = await bindActions(
      {
        'xui:import': {
          previewLib: "data:text/javascript,export const notify = () => 'from-native-import'",
        },
        api: '@action:previewLib.notify',
      },
      page,
    );

    expect(bound).toMatchObject({ api: 'action://previewLib.notify' });
    expect(page.getAction('previewLib.notify')?.()).toBe('from-native-import');
    expect(systemImport).not.toHaveBeenCalled();
  });

  it('stops parent scoped lookup at standalone import boundaries', async () => {
    const page = createAmisPageObject('https://example.com/schema/demo.json');

    registerAmisRuntimeAdapter(
      createMockAdapter({
        compileFunction: compileTestFunction,
      }),
    );

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
});
