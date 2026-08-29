import { describe, expect, it } from 'vitest';
import { buildExtensionInjectionScript, injectExtensionSources } from './inject.mjs';

const HOST_HTML = [
  '<!doctype html>',
  '<html>',
  '  <head>',
  '    <meta charset="utf-8" />',
  '    <title>Host</title>',
  '  </head>',
  '  <body>',
  '    <div id="root"></div>',
  '    <script type="module" src="/assets/index.js"></script>',
  '  </body>',
  '</html>',
].join('\n');

describe('buildExtensionInjectionScript', () => {
  it('registers sources via window.__NOP_EXTENSIONS__ before bootstrap', () => {
    const script = buildExtensionInjectionScript([
      { id: 'my-ext', url: 'http://127.0.0.1:4180/src/index.ts' },
    ]);

    expect(script).toContain('window.__NOP_EXTENSIONS__ = [');
    expect(script).toContain('id: "my-ext"');
    expect(script).toContain('import("http://127.0.0.1:4180/src/index.ts")');
    expect(script).toContain('if (window.__NOP_EXTENSIONS__ !== undefined) { return; }');
  });

  it('supports multiple extensions and escapes urls', () => {
    const script = buildExtensionInjectionScript([
      { id: 'a', url: 'http://127.0.0.1:4180/entry-a.ts' },
      { id: 'b', url: "http://127.0.0.1:4180/path with spaces/x'b.ts" },
    ]);

    expect(script).toContain('"a"');
    expect(script).toContain('"b"');
    expect(script).toContain('http://127.0.0.1:4180/path with spaces/x\'b.ts');
  });

  it('rejects invalid ids, duplicate ids and non-http urls', () => {
    expect(() =>
      buildExtensionInjectionScript([{ id: 'bad id!', url: 'http://x' }]),
    ).toThrow(/invalid extension id/);

    expect(() =>
      buildExtensionInjectionScript([
        { id: 'a', url: 'http://x' },
        { id: 'a', url: 'http://y' },
      ]),
    ).toThrow(/duplicate extension id/);

    expect(() =>
      buildExtensionInjectionScript([{ id: 'a', url: '/relative.js' }]),
    ).toThrow(/absolute http\(s\) url/);
  });
});

describe('injectExtensionSources', () => {
  it('inserts the script right after <head> so it runs before deferred modules', () => {
    const out = injectExtensionSources(HOST_HTML, [
      { id: 'my-ext', url: 'http://127.0.0.1:4180/src/index.ts' },
    ]);

    const headEnd = HOST_HTML.indexOf('<title>Host</title>');
    const injectedAt = out.indexOf('window.__NOP_EXTENSIONS__ = [');
    const moduleScriptAt = out.indexOf('type="module"');

    expect(injectedAt).toBeGreaterThan(headEnd);
    expect(injectedAt).toBeLessThan(moduleScriptAt);
    expect(out).toContain('<title>Host</title>');
    expect(out).toContain('<script type="module" src="/assets/index.js"></script>');
  });

  it('injects exactly once into an already-clean document', () => {
    const out = injectExtensionSources(HOST_HTML, [
      { id: 'x', url: 'http://127.0.0.1:4180/x.ts' },
    ]);
    const matches = out.match(/window\.__NOP_EXTENSIONS__ = \[/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('falls back to after-doctype insertion when <head> is absent', () => {
    const out = injectExtensionSources('<!doctype html><html><body>x</body></html>', [
      { id: 'x', url: 'http://127.0.0.1:4180/x.ts' },
    ]);
    expect(out.indexOf('window.__NOP_EXTENSIONS__')).toBeGreaterThan(
      out.indexOf('<!doctype html>'),
    );
    expect(out.endsWith('<body>x</body></html>')).toBe(true);
  });
});