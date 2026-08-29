import { afterEach, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { startDevInHostProxy } from './proxy.mjs';

/** @type {Array<{ close: () => Promise<void> }>} */
const started = [];

afterEach(async () => {
  for (const item of started.splice(0)) {
    await item.close();
  }
});

/** @type {(html: string) => string} */
const HOST_HTML = (title) =>
  [
    '<!doctype html>',
    '<html>',
    '<head><title>' + title + '</title></head>',
    '<body>',
    '<script type="module" src="/assets/index.js"></script>',
    '</body>',
    '</html>',
  ].join('\n');

describe('startDevInHostProxy', () => {
  it('injects extension sources into HTML responses before the host module script', async () => {
    const backend = createServer((req, res) => {
      if (req.url === '/gzip-page') {
        const body = gzipSync(Buffer.from(HOST_HTML('Gzipped'), 'utf8'));
        res.writeHead(200, {
          'content-type': 'text/html; charset=utf-8',
          'content-encoding': 'gzip',
        });
        res.end(body);
        return;
      }
      if (req.url === '/assets/app.js') {
        res.writeHead(200, { 'content-type': 'text/javascript' });
        res.end('console.log("app");');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(HOST_HTML('Plain'));
    });

    await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve));
    const backendUrl = `http://127.0.0.1:${backend.address().port}`;

    const proxy = await startDevInHostProxy({
      backend: backendUrl,
      extensions: [{ id: 'my-ext', url: 'http://127.0.0.1:4180/src/index.ts' }],
      port: 0,
      verbose: false,
    });
    started.push(proxy);

    // Plain HTML: injected once, before the deferred module script.
    const plain = await fetch(`${proxy.url}/`);
    const plainBody = await plain.text();
    expect(plain.status).toBe(200);
    expect(plainBody).toContain('<title>Plain</title>');
    expect(plainBody).toContain('window.__NOP_EXTENSIONS__ = [');
    expect(plainBody).toContain('import("http://127.0.0.1:4180/src/index.ts")');
    expect(plainBody.indexOf('window.__NOP_EXTENSIONS__')).toBeLessThan(
      plainBody.indexOf('type="module"'),
    );

    // Gzip-compressed HTML: decompressed, injected, re-sent without content-encoding.
    const gz = await fetch(`${proxy.url}/gzip-page`);
    const gzBody = await gz.text();
    expect(gz.status).toBe(200);
    expect(gz.headers.get('content-encoding')).toBeNull();
    expect(gzBody).toContain('<title>Gzipped</title>');
    expect(gzBody).toContain('window.__NOP_EXTENSIONS__ = [');
  });

  it('passes non-HTML responses through byte-identically', async () => {
    const backend = createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'text/javascript' });
      res.end('console.log("app");');
    });
    await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve));
    started.push({
      close: () => new Promise((resolve) => backend.close(() => resolve(undefined))),
    });

    const proxy = await startDevInHostProxy({
      backend: `http://127.0.0.1:${backend.address().port}`,
      extensions: [{ id: 'x', url: 'http://127.0.0.1:4180/x.ts' }],
      port: 0,
    });
    started.push(proxy);

    const res = await fetch(`${proxy.url}/assets/app.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/javascript');
    expect(await res.text()).toBe('console.log("app");');
  });

  it('returns a readable 502 when the backend is unreachable', async () => {
    // Port 1 is practically guaranteed closed.
    const proxy = await startDevInHostProxy({
      backend: 'http://127.0.0.1:1',
      extensions: [{ id: 'x', url: 'http://127.0.0.1:4180/x.ts' }],
      port: 0,
    });
    started.push(proxy);

    const res = await fetch(`${proxy.url}/`);
    expect(res.status).toBe(502);
    expect(await res.text()).toContain('backend unreachable');
  });

  it('rejects missing extensions or non-http backends', async () => {
    await expect(
      startDevInHostProxy({ backend: 'http://127.0.0.1:1', extensions: [], port: 0 }),
    ).rejects.toThrow();
    await expect(
      startDevInHostProxy({ backend: 'ftp://x', extensions: [{ id: 'x', url: 'http://x' }], port: 0 }),
    ).rejects.toThrow(/backend must be an absolute http\(s\) URL/);
  });
});