/**
 * Minimal static asset server with CORS — used to serve built extension
 * artifacts (or a Vite-build `dist`) so the in-page dynamic `import()` from
 * the dev-in-host proxy can load them cross-origin.
 *
 * CORS is on by default (`Access-Control-Allow-Origin: *`), matching what
 * extension develop servers need. Responses are marked `no-store` so
 * re-builds always take effect.
 */

import { createReadStream, existsSync, statSync } from 'node:fs';
import http from 'node:http';
import { extname, normalize, resolve, sep } from 'node:path';

/** @type {Record<string, string>} */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.gz': 'application/gzip',
};

/**
 * @typedef {Object} StaticServerOptions
 * @property {string} dir - Directory to serve.
 * @property {number} [port] - Listen port (default 4180; 0 = ephemeral).
 * @property {string} [host] - Bind host (default `127.0.0.1`).
 * @property {boolean} [cors] - Send `Access-Control-Allow-Origin: *` (default true).
 * @property {Console} [logger] - Logger (default `console`).
 * @property {boolean} [verbose] - Log every request (default false).
 */

/**
 * Start the static server.
 *
 * @param {StaticServerOptions} options
 * @returns {Promise<{ server: import('node:http').Server; url: string; close: () => Promise<void> }>}
 */
export function startStaticServer({ dir, port = 4180, host = '127.0.0.1', cors = true, logger = console, verbose = false }) {
  return new Promise((resolvePromise, reject) => {
    const root = resolve(dir);

    if (!existsSync(root) || !statSync(root).isDirectory()) {
      reject(new Error(`startStaticServer: not a directory: ${dir}`));
      return;
    }

    const server = http.createServer((req, res) => {
      const corsHeaders = cors
        ? {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, HEAD, OPTIONS',
            'access-control-allow-headers': '*',
          }
        : {};

      /**
       * @param {number} status
       * @param {string} message
       */
      const sendError = (status, message) => {
        res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', ...corsHeaders });
        res.end(message);
      };

      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders);
        res.end();
        return;
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        sendError(405, 'Method not allowed');
        return;
      }

      let pathname;
      try {
        pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
      } catch {
        sendError(400, 'Bad request');
        return;
      }

      const basePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const candidate = normalize(resolve(root, basePath));

      // Path traversal guard: resolved path must stay inside the root.
      if (candidate !== root && !candidate.startsWith(`${root}${sep}`) && !candidate.startsWith(`${root}/`)) {
        sendError(403, 'Forbidden');
        return;
      }

      if (!existsSync(candidate) || !statSync(candidate).isFile()) {
        sendError(404, `Not found: ${pathname}`);
        return;
      }

      const type = MIME_TYPES[extname(candidate).toLowerCase()] ?? 'application/octet-stream';
      res.writeHead(200, {
        'content-type': type,
        'cache-control': 'no-store',
        ...corsHeaders,
      });

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      createReadStream(candidate).on('error', (error) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[serve] failed to stream ${candidate}: ${message}`);
        res.destroy();
      }).pipe(res);

      if (verbose) {
        logger.log(`[serve] GET ${pathname} -> ${candidate}`);
      }
    });

    server.on('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      const actualPort = typeof address === 'object' && address !== null ? address.port : port;
      resolvePromise({
        server,
        url: `http://${host}:${actualPort}`,
        close: () =>
          new Promise((closeResolve) => {
            server.close(() => closeResolve(undefined));
          }),
      });
    });
  });
}