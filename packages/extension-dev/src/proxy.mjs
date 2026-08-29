/**
 * `dev-in-host` reverse proxy.
 *
 * Proxies the real host (e.g. nop-entropy serving the built site) while
 * injecting the extension-source script into every HTML response. Browsing
 * the proxy origin gives the full host runtime with your extension loaded —
 * no host source, no host rebuild.
 *
 * Behaviour:
 * - `text/html` responses are buffered, decompressed (gzip/br/deflate),
 *   injected and re-sent with accurate headers.
 * - Everything else streams through unchanged.
 * - Backend failures produce a readable 502.
 */

import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';

import { injectExtensionSources } from './inject.mjs';

/**
 * @typedef {import('./inject.mjs').InjectedExtension} InjectedExtension
 */

/**
 * @param {Buffer} buffer
 * @param {string} encoding - Lower-cased `content-encoding` value.
 * @returns {Buffer}
 */
function decodeBody(buffer, encoding) {
  switch (encoding) {
    case 'gzip':
    case 'x-gzip':
      return zlib.gunzipSync(buffer);
    case 'deflate':
      return zlib.inflateSync(buffer);
    case 'br':
      return zlib.brotliDecompressSync(buffer);
    case 'identity':
    case '':
      return buffer;
    default:
      throw new Error(`Unsupported content-encoding '${encoding}'`);
  }
}

/**
 * @typedef {Object} DevInHostOptions
 * @property {string} backend - Backend origin, e.g. `http://127.0.0.1:8080`.
 * @property {InjectedExtension[]} extensions - Extension sources to inject.
 * @property {number} [port] - Proxy listen port (default 5174).
 * @property {string} [host] - Proxy bind host (default `127.0.0.1`).
 * @property {Console} [logger] - Logger (default `console`).
 * @property {boolean} [verbose] - Log every request (default false).
 */

/**
 * Start the dev-in-host proxy.
 *
 * @param {DevInHostOptions} options
 * @returns {Promise<{ server: import('node:http').Server; url: string; close: () => Promise<void> }>}
 */
export function startDevInHostProxy({
  backend,
  extensions,
  port = 5174,
  host = '127.0.0.1',
  logger = console,
  verbose = false,
}) {
  return new Promise((resolvePromise, reject) => {
    if (typeof backend !== 'string' || !/^https?:\/\//.test(backend)) {
      reject(new TypeError('startDevInHostProxy: backend must be an absolute http(s) URL'));
      return;
    }

    if (!Array.isArray(extensions) || extensions.length === 0) {
      reject(new TypeError('startDevInHostProxy: at least one extension source is required'));
      return;
    }

    const backendUrl = new URL(backend);
    const transport = backendUrl.protocol === 'https:' ? https : http;

    const server = http.createServer((req, res) => {
      const target = new URL(req.url ?? '/', backendUrl);

      /** @type {Record<string, string | string[] | number | undefined>} */
      const upstreamHeaders = { ...req.headers };
      delete upstreamHeaders.host;

      const upstream = transport.request(
        target,
        { method: req.method, headers: upstreamHeaders },
        (upstreamRes) => {
          const status = upstreamRes.statusCode ?? 502;
          const contentType = String(upstreamRes.headers['content-type'] ?? '');
          const isHtml = contentType.includes('text/html');

          if (!isHtml) {
            res.writeHead(status, upstreamRes.headers);
            upstreamRes.pipe(res);
            if (verbose) {
              logger.log(`[dev-in-host] ${req.method} ${req.url} -> ${status} (passthrough)`);
            }
            return;
          }

          // Buffer HTML so we can decompress / inject / recompute length.
          /** @type {import('node:buffer').Buffer[]} */
          const chunks = [];
          upstreamRes.on('data', (chunk) => {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          });
          upstreamRes.on('end', () => {
            const body = Buffer.concat(chunks);
            const encoding = String(upstreamRes.headers['content-encoding'] ?? 'identity').toLowerCase();

            /** @type {Buffer} */
            let decoded;

            try {
              decoded = decodeBody(body, encoding);
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              logger.error(`[dev-in-host] failed to decode ${req.url}: ${message}`);
              if (!res.headersSent) {
                res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
                res.end(`[nop-extension-dev] failed to decode HTML response (${encoding}): ${message}`);
              } else {
                res.destroy();
              }
              return;
            }

            const html = decoded.toString('utf8');
            const injected = injectExtensionSources(html, extensions);

            const resHeaders = { ...upstreamRes.headers };
            delete resHeaders['content-encoding'];
            delete resHeaders['content-length'];
            resHeaders['content-type'] = contentType || 'text/html; charset=utf-8';

            const out = Buffer.from(injected, 'utf8');
            res.writeHead(status, resHeaders);
            res.end(out);

            if (verbose) {
              logger.log(
                `[dev-in-host] ${req.method} ${req.url} -> ${status} ` +
                  `(html, injected ${extensions.length} extension source(s))`,
              );
            }
          });
        },
      );

      upstream.on('error', (error) => {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[dev-in-host] backend request to ${backend} failed: ${message}`);
        if (!res.headersSent) {
          res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
          res.end(`[nop-extension-dev] backend unreachable (${backend}): ${message}\n`);
        } else {
          res.destroy();
        }
      });

      req.pipe(upstream);
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