import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startStaticServer } from './serve.mjs';

/** @type {Array<{ close: () => Promise<void> }>} */
const started = [];

afterEach(async () => {
  for (const item of started.splice(0)) {
    await item.close();
  }
});

/** @type {() => string} */
function makeFixtureDir() {
  const dir = mkdtempSync(join(tmpdir(), 'extension-dev-serve-'));
  mkdirSync(join(dir, 'assets'));
  mkdirSync(join(dir, 'locales', 'en-US'), { recursive: true });
  writeFileSync(join(dir, 'index.html'), '<!doctype html><html><body>ext</body></html>');
  writeFileSync(join(dir, 'assets', 'index.js'), 'export default 1;');
  writeFileSync(join(dir, 'locales', 'en-US', 'translation.json'), '{"ok":true}');
  return dir;
}

describe('startStaticServer', () => {
  it('serves files with CORS and no-store, resolving / to index.html', async () => {
    const dir = makeFixtureDir();
    const server = await startStaticServer({ dir, port: 0, verbose: false });
    started.push(server);

    const index = await fetch(`${server.url}/`);
    expect(index.status).toBe(200);
    expect(index.headers.get('access-control-allow-origin')).toBe('*');
    expect(index.headers.get('cache-control')).toContain('no-store');
    expect(await index.text()).toContain('ext');

    const js = await fetch(`${server.url}/assets/index.js`);
    expect(js.status).toBe(200);
    expect(js.headers.get('content-type')).toContain('javascript');
    expect(await js.text()).toBe('export default 1;');

    const i18n = await fetch(`${server.url}/locales/en-US/translation.json`);
    expect(i18n.status).toBe(200);
    expect(await i18n.json()).toEqual({ ok: true });
  });

  it('supports disabling CORS', async () => {
    const server = await startStaticServer({
      dir: makeFixtureDir(),
      port: 0,
      cors: false,
    });
    started.push(server);

    const res = await fetch(`${server.url}/`);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns 404 for missing files and 403 for path traversal', async () => {
    const dir = makeFixtureDir();
    const server = await startStaticServer({ dir, port: 0 });
    started.push(server);

    const missing = await fetch(`${server.url}/nope.js`);
    expect(missing.status).toBe(404);

    const traversal = await fetch(`${server.url}/..%2fpackage.json`);
    expect(traversal.status).toBe(403);
  });
});