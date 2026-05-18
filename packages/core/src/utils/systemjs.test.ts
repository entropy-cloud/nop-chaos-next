import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isSystemJsEntry, loadRemoteComponent, registerSharedModules } from './systemjs';

describe('systemjs utils', () => {
  beforeEach(() => {
    delete (
      globalThis as typeof globalThis & {
        System?: { import: (url: string) => Promise<unknown>; addImportMap: (map: { imports: Record<string, string> }) => void; set: (name: string, module: unknown) => void };
      }
    ).System;
  });

  it('detects system entry urls with query strings', () => {
    expect(isSystemJsEntry('/plugins/plugin-demo.system.js')).toBe(true);
    expect(isSystemJsEntry('/plugins/plugin-demo.system.js?t=1')).toBe(true);
    expect(() => isSystemJsEntry('https://example.com/plugins/plugin-demo.js')).toThrow(
      'Only relative same-origin paths are allowed',
    );
    expect(() => isSystemJsEntry('data:text/javascript,export default {}')).toThrow(
      'Only relative same-origin paths are allowed',
    );
  });

  it('loads system bundles through System.import', async () => {
    const Component = () => null;
    const systemImport = vi.fn(async () => ({ default: Component }));

    vi.stubGlobal('System', {
      import: systemImport,
    });

    await expect(loadRemoteComponent('/plugins/plugin-demo.system.js?t=2')).resolves.toBe(
      Component,
    );
    expect(systemImport).toHaveBeenCalledWith('/plugins/plugin-demo.system.js?t=2');
  });

  it('rejects protocol-based remote component urls', async () => {
    await expect(loadRemoteComponent('https://example.com/plugin.js')).rejects.toThrow(
      'Only relative same-origin paths are allowed: https://example.com/plugin.js',
    );
  });

  it('throws when SystemJS is missing for system entries', async () => {
    await expect(
      loadRemoteComponent('/plugins/plugin-demo.system.js'),
    ).rejects.toThrow('SystemJS is required to load plugin module');
  });

  it('registerSharedModules registers modules with import map and System.set', () => {
    const addImportMap = vi.fn();
    const set = vi.fn();
    const reactModule = { createElement: () => {} };
    const reactDomModule = { createRoot: () => {} };

    vi.stubGlobal('System', { import: vi.fn(), addImportMap, set });

    registerSharedModules({ react: reactModule, 'react-dom': reactDomModule });

    expect(addImportMap).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenCalledTimes(2);
    expect(set).toHaveBeenCalledWith(expect.stringContaining('react.js'), reactModule);
    expect(set).toHaveBeenCalledWith(expect.stringContaining('react-dom.js'), reactDomModule);
  });

  it('registerSharedModules uses custom basePath', () => {
    const addImportMap = vi.fn();
    const set = vi.fn();

    vi.stubGlobal('System', { import: vi.fn(), addImportMap, set });

    registerSharedModules({ react: {} }, '/custom-shared/');

    expect(addImportMap).toHaveBeenCalledWith({
      imports: { react: expect.stringContaining('/custom-shared/react.js') },
    });
  });

  it('loads system module and extracts default export', async () => {
    const DefaultComponent = () => 'default';
    const systemImport = vi.fn(async () => ({ default: DefaultComponent }));

    vi.stubGlobal('System', { import: systemImport });

    const result = await loadRemoteComponent('/plugins/test.system.js');
    expect(result).toBe(DefaultComponent);
  });

  it('rejects remote modules whose default export is not a component', async () => {
    const systemImport = vi.fn(async () => ({ default: 'not-a-component' }));

    vi.stubGlobal('System', { import: systemImport });

    await expect(loadRemoteComponent('/plugins/invalid.system.js')).rejects.toThrow(
      'Remote module must default export a React component: /plugins/invalid.system.js',
    );
  });
});
