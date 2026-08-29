#!/usr/bin/env node
/**
 * Vite dev plugin that integrates a built host (nop-chaos-next dist) with
 * the extension source code in the current project.
 *
 * Resolves the host dist from:
 *   1. HOST_DIST environment variable (path to apps/main/dist or similar)
 *   2. A sibling nop-chaos-next repo (../../apps/main/dist)
 *   3. A host-shell.tar.gz inside the sdks directory (if present)
 *
 * What the plugin does:
 *   - Serves shell files (index.html, assets/*, nop-shared/*, locales/*,
 *     vendor/*, favicon.svg, ...) directly from the host dist.
 *   - For `/`, reads the host's index.html and injects a module script
 *     that imports the extension's entry from the Vite dev server.
 *   - Vite still serves the extension source (src/**) with HMR.
 *
 * Single command dev: `pnpm dev` → loads the host page + auto-injects
 * the extension. Changes to the extension source trigger HMR.
 */

import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { extname, dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HOST_DIST_ENV = 'HOST_DIST';
const HOST_DIST_MOCK_ENV = 'HOST_DIST_MOCK';

const INJECTION_MARKER = '<!--NOP_EXTENSIONS_INJECT-->';

const MIME_TYPES = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
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
  '.eot': 'application/vnd.ms-fontobject',
  '.html': 'text/html',
  '.txt': 'text/plain',
  '.map': 'application/json',
};

function getMimeType(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] ?? null;
}

/**
 * Modules that the host provides at runtime via the import map. These
 * MUST stay as bare specifiers in the extension's Vite-served output —
 * otherwise Vite bundles a second copy and we hit the classic double-
 * React / amis-core renderer conflict.
 *
 * Mirrors `packages/shared/src/plugins/sharedModuleNames.ts`.
 */
const SHARED_MODULE_NAMES = new Set([
  'react',
  'react-dom',
  'react/jsx-dev-runtime',
  'react/jsx-runtime',
  'react-router-dom',
  'zustand',
  '@tanstack/react-query',
  '@nop-chaos/plugin-bridge',
  '@nop-chaos/shared',
  '@nop-chaos/ui',
  'i18next',
  'react-i18next',
  'lucide-react',
  'sonner',
  // Rendering engines
  '@nop-chaos/flux',
  'amis',
  'amis-core',
  'amis-ui',
  'amis-formula',
]);

/**
 * Vite plugin: rewrite shared-module imports in the extension source
 * to bare specifiers (the host's import map resolves them at runtime).
 *
 * Why this works:
 *   - The host fetches the extension entry via `import('/src/index.ts')`,
 *     which lands in the host's module graph (governed by the import map).
 *   - Vite transforms `.ts/.tsx` files in its dev pipeline, but for shared
 *     modules we want Vite to leave the imports as bare specifiers so
 *     the browser uses the host's import map (single React/UI instance).
 *   - Using `resolveId` returning `{external: true}` causes Vite to
 *     generate `/@id/<name>` URLs which only resolve inside Vite's own
 *     module graph — not the host's. So we rewrite the served output
 *     to use the original bare specifier instead.
 *
 * Implementation: a `transform` hook that post-processes served JS/TS
 * output to swap Vite's `/@id/<pkg>` URLs back to the original bare name.
 * Also: a `resolveId` hook returning `null` so Vite doesn't try to bundle
 * (let it pre-bundle normally, then we rewrite the output).
 */
function sharedModulesExternalPlugin() {
  return {
    name: 'extension-shared-modules-rewrite',
    enforce: 'post',
    transform(code, id) {
      if (!id.match(/\.(ts|tsx|js|jsx|mjs)$/)) return null;
      // Vite rewrites `import 'foo'` to `import '/@id/foo'` when the module
      // was resolved by id. We want bare specifiers for SHARED_MODULE_NAMES
      // so the host's import map resolves them.
      let out = code;
      let changed = false;
      for (const name of SHARED_MODULE_NAMES) {
        // Match `/@id/<name>` (no path separator inside name).
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(['"])/@id/${escaped}(['"])`, 'g');
        if (re.test(out)) {
          out = out.replace(re, `$1${name}$2`);
          changed = true;
        }
      }
      return changed ? out : null;
    },
  };
}

/**
 * Find the host dist directory.
 *
 * Priority:
 *   1. process.env.HOST_DIST_MOCK (mock-enabled build for dev:mock)
 *   2. process.env.HOST_DIST
 *   3. ../../apps/main/dist (sibling nop-chaos-next repo)
 *   4. .cache/host-shell/ (extracted from tarball — TBD)
 */
function resolveHostDist() {
  for (const envName of [HOST_DIST_MOCK_ENV, HOST_DIST_ENV]) {
    if (process.env[envName]) {
      const candidate = resolve(process.env[envName]);
      if (existsSync(join(candidate, 'index.html'))) {
        return candidate;
      }
      console.warn(`[extension-dev] ${envName}=${candidate} but no index.html found`);
    }
  }

  // Sibling nop-chaos-next repo (developer runs extension from
  // a separate folder alongside nop-chaos-next).
  const siblingCandidate = resolve(process.cwd(), '../../apps/main/dist');
  if (existsSync(join(siblingCandidate, 'index.html'))) {
    return siblingCandidate;
  }

  return null;
}

/**
 * API paths to forward to the backend in dev mode. The host's production
 * build has no proxy — we add one here so the browser can call /r/*,
 * /graphql, etc. against the Java backend. Configurable via
 * BACKEND_ORIGIN env var, default http://localhost:8080.
 *
 * Mock-mode skip: when HOST_DIST_MOCK is set, the host dist was built
 * with mock APIs — proxying would conflict. The user explicitly opts
 * into one or the other via env var.
 */
const API_PROXY_PREFIXES = ['/r/', '/graphql', '/p/', '/f/', '/q/'];
const BACKEND_ORIGIN_ENV = 'BACKEND_ORIGIN';

/**
 * Build a proxy middleware that forwards matching paths to BACKEND_ORIGIN.
 * Standard HTTP/HTTPS proxy with hop-by-hop header stripping.
 */
function createApiProxyMiddleware(backendOrigin) {
  const target = new URL(backendOrigin);
  const isHttps = target.protocol === 'https:';

  return (req, res, next) => {
    const url = req.url ?? '/';
    const urlPath = url.split('?')[0];

    if (!API_PROXY_PREFIXES.some((prefix) => urlPath.startsWith(prefix))) {
      return next();
    }

    const [pathname, search = ''] = url.split('?');
    const targetPath = pathname + (search ? `?${search}` : '');

    const lib = isHttps ? https : http;
    const proxyReq = lib.request(
      {
        hostname: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: targetPath,
        method: req.method,
        headers: {
          ...req.headers,
          host: target.host,
        },
      },
      (proxyRes) => {
        // Strip hop-by-hop headers
        const headers = { ...proxyRes.headers };
        delete headers['transfer-encoding'];
        delete headers['connection'];
        res.writeHead(proxyRes.statusCode || 502, headers);
        proxyRes.pipe(res);
      },
    );

    proxyReq.on('error', (err) => {
      console.error(`[extension-dev] API proxy error for ${req.url}:`, err.message);
      if (!res.headersSent) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
      }
      res.end(JSON.stringify({ error: 'Backend unreachable', detail: err.message }));
    });

    req.pipe(proxyReq);
  };
}

/**
 * Returns true if the request path belongs to the host (not the extension).
 * The extension source is served by Vite itself; everything else is shell.
 */
function isHostAssetPath(urlPath) {
  // /assets/, /nop-shared/, /locales/, /vendor/, /plugins/, /data/, /mock/, /api/
  // /favicon.svg, /favicon.ico
  return (
    urlPath === '/' ||
    urlPath === '/index.html' ||
    urlPath.startsWith('/assets/') ||
    urlPath.startsWith('/nop-shared/') ||
    urlPath.startsWith('/locales/') ||
    urlPath.startsWith('/vendor/') ||
    urlPath.startsWith('/plugins/') ||
    urlPath.startsWith('/data/') ||
    urlPath.startsWith('/mock/') ||
    urlPath.startsWith('/api/') ||
    urlPath === '/favicon.svg' ||
    urlPath === '/favicon.ico'
  );
}

/**
 * Build the injection script — sets window.__NOP_EXTENSIONS__ before
 * the host bootstrap runs (the host module is deferred, so an inline
 * script in <head> fires first).
 */
function buildInjectionScript(extensionEntry) {
  const source = JSON.stringify(extensionEntry);
  return `<script>(function(){window.__NOP_EXTENSIONS__=[{"id":"dev-extension","entry":${source}}];})();</script>`;
}

/**
 * @returns {import('vite').PluginOption[]}
 */
export function hostShellPlugin(options = {}) {
  const extensionEntry = options.entry ?? '/src/index.ts';
  const hostDist = resolveHostDist();

  if (!hostDist) {
    console.warn(`[extension-dev] No host dist found.`);
    console.warn(`[extension-dev] Set ${HOST_DIST_ENV}=<path-to-dist> or place this project next to a nop-chaos-next repo.`);
    console.warn(`[extension-dev] Falling back to standalone mode (extension only).`);
    return [
      {
        name: 'extension-host-shell-missing',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            if (req.url === '/' || req.url === '/index.html') {
              res.statusCode = 503;
              res.end(
                '<h1>Host dist not found</h1>' +
                  `<p>Set ${HOST_DIST_ENV} environment variable or run this project next to nop-chaos-next.</p>`,
              );
              return;
            }
            next();
          });
        },
      },
    ];
  }

  console.log(`[extension-dev] Using host dist: ${hostDist}`);

  return [
    sharedModulesExternalPlugin(),
    {
      name: 'extension-host-shell',

      /**
       * Serve host files for known shell paths.
       * The extension source (/src/*) is served by Vite's default pipeline.
       */
      configureServer(server) {
        // API proxy: forward /r/* /graphql etc. to the Java backend in
        // dev mode. Skipped when HOST_DIST_MOCK is set (mock-enabled
        // host dist serves mock data via its own /mock/ directory).
        const useMockHost = Boolean(process.env[HOST_DIST_MOCK_ENV]);
        if (!useMockHost) {
          const backendOrigin = process.env[BACKEND_ORIGIN_ENV] || 'http://localhost:8080';
          console.log(`[extension-dev] API proxy → ${backendOrigin}`);
          server.middlewares.use(createApiProxyMiddleware(backendOrigin));
        } else {
          console.log(`[extension-dev] Mock host (HOST_DIST_MOCK) — API proxy disabled`);
        }

        server.middlewares.use((req, res, next) => {
          const url = req.url ?? '/';
          const urlPath = url.split('?')[0];

          if (!isHostAssetPath(urlPath)) {
            return next();
          }

          // Map URL to host dist file.
          let relativePath;
          if (urlPath === '/' || urlPath === '/index.html') {
            relativePath = 'index.html';
          } else {
            relativePath = urlPath.replace(/^\//, '');
          }

          const filePath = join(hostDist, relativePath);

          // Security: prevent path traversal.
          const resolved = resolve(filePath);
          if (!resolved.startsWith(resolve(hostDist))) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
          }

          if (!existsSync(filePath) || !statSync(filePath).isFile()) {
            res.statusCode = 404;
            res.end(`Not found: ${urlPath}`);
            return;
          }

          if (relativePath === 'index.html') {
            // Read and inject extension entry.
            let html = readFileSync(filePath, 'utf8');
            const injection = buildInjectionScript(extensionEntry);
            if (html.includes(INJECTION_MARKER)) {
              html = html.replace(INJECTION_MARKER, injection + INJECTION_MARKER);
            } else {
              // Fallback: insert before </head>.
              html = html.replace(/<\/head>/i, `${injection}\n</head>`);
            }
            res.setHeader('Content-Type', 'text/html');
            res.end(html);
            return;
          }

          // Pass through with proper MIME type + CORS for cross-origin extension source.
          const mime = getMimeType(filePath);
          if (mime) {
            res.setHeader('Content-Type', mime);
          }
          res.setHeader('Access-Control-Allow-Origin', '*');
          createReadStream(filePath).pipe(res);
        });
      },

      /**
       * Disable Vite's default HTML serving — host owns index.html.
       */
      configResolved(config) {
        config.appType = 'spa';
        config.server.open = false;
      },
    },
  ];
}