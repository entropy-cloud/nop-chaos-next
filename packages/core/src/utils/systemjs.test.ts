import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isSystemJsEntry, loadRemoteComponent } from './systemjs';

describe('systemjs utils', () => {
  beforeEach(() => {
    delete (
      globalThis as typeof globalThis & { System?: { import: (url: string) => Promise<unknown> } }
    ).System;
  });

  it('detects system entry urls with query strings', () => {
    expect(isSystemJsEntry('/plugins/plugin-demo.system.js')).toBe(true);
    expect(isSystemJsEntry('/plugins/plugin-demo.system.js?t=1')).toBe(true);
    expect(isSystemJsEntry('https://example.com/plugins/plugin-demo.js')).toBe(false);
    expect(isSystemJsEntry('data:text/javascript,export default {}')).toBe(false);
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

  it('uses native import for non-system bundles', async () => {
    const moduleUrl = 'data:text/javascript,export default function PluginDemo() { return null }';

    await expect(loadRemoteComponent(moduleUrl)).resolves.toBeTypeOf('function');
  });
});
