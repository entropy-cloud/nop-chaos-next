import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, extname, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mergeNode } from '@nop-chaos/delta-merge';
import type { Plugin, ViteDevServer, Connect } from 'vite';

type ServerResponse = import('node:http').ServerResponse;

export interface PrototypeServerOptions {
  dir: string;
  prefix?: string;
  extensionEntry?: string;
}

const EXTENSIONS_INJECT_MARKER = '<!--NOP_EXTENSIONS_INJECT-->';

export function prototypeServerPlugin(options: PrototypeServerOptions): Plugin {
  const prefix = options.prefix ?? '/api/prototype';
  const dir = resolve(options.dir);
  const extensionEntry = options.extensionEntry ? resolve(options.extensionEntry) : undefined;

  return {
    name: '@nop-chaos/prototype-server',
    transformIndexHtml(html: string) {
      if (!extensionEntry) {
        return html;
      }

      const fsEntry = `/@fs${extensionEntry}`;
      const sources = [{ id: 'prototype-shell-extension', entry: fsEntry }];
      const inject = `<script>window.__NOP_EXTENSIONS__ = ${JSON.stringify(sources)};</script>`;

      return html.replace(EXTENSIONS_INJECT_MARKER, inject);
    },
    async configureServer(server: ViteDevServer) {
      const loader = async (path: string): Promise<unknown> => {
        if (!existsSync(path)) return null;
        return JSON.parse(readFileSync(path, 'utf-8'));
      };

      await loadMockMiddleware(dir, server.middlewares);

      server.middlewares.use(
        async (req: Connect.IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
          if (!req.url) return next();

          const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
          const pathname = url.pathname;

          try {
            if (req.method === 'GET' && pathname === `${prefix}/menu.json`) {
              const menuPath = resolve(dir, 'menu.json');
              if (!existsSync(menuPath)) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'menu.json not found' }));
                return;
              }
              const menu = JSON.parse(readFileSync(menuPath, 'utf-8'));
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(menu));
              return;
            }

            const pageMatch = pathname.match(
              new RegExp(`^${escapeRegex(prefix)}/pages/(.+\\.json)$`),
            );
            if (req.method === 'GET' && pageMatch) {
              const filePath = resolve(dir, 'pages', pageMatch[1]);
              if (!existsSync(filePath)) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'page not found' }));
                return;
              }
              const pageContent = JSON.parse(readFileSync(filePath, 'utf-8'));
              if (pageContent && typeof pageContent === 'object' && pageContent['x:extends']) {
                const baseDir = dirname(filePath);
                const merged = await mergeNode(pageContent, { loader, baseDir });
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(merged));
              } else {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(pageContent));
              }
              return;
            }

            const assetMatch = pathname.match(new RegExp(`^${escapeRegex(prefix)}/assets/(.+)$`));
            if (req.method === 'GET' && assetMatch) {
              const assetPath = resolve(dir, 'assets', assetMatch[1]);
              if (!existsSync(assetPath)) {
                res.statusCode = 404;
                res.end('Not found');
                return;
              }
              const ext = extname(assetPath).toLowerCase();
              const mimeTypes: Record<string, string> = {
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.gif': 'image/gif',
                '.svg': 'image/svg+xml',
                '.css': 'text/css',
                '.js': 'application/javascript',
                '.json': 'application/json',
              };
              res.setHeader('Content-Type', mimeTypes[ext] ?? 'application/octet-stream');
              res.end(readFileSync(assetPath));
              return;
            }
          } catch (err) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
            );
            return;
          }

          next();
        },
      );

      server.watcher.add(dir);
      server.watcher.on('change', (changedPath: string) => {
        if (changedPath.startsWith(dir) && changedPath.endsWith('.json')) {
          server.ws.send({
            type: 'custom',
            event: 'prototype:change',
            data: { path: changedPath },
          });
        }
      });
    },
  };
}

async function loadMockMiddleware(dir: string, middlewares: Connect.Server): Promise<void> {
  const mockDir = resolve(dir, 'mock');
  if (!existsSync(mockDir)) return;

  const entries = readdirSync(mockDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.name.endsWith('.mjs') && !entry.name.endsWith('.js')) continue;
    if (entry.isDirectory()) continue;
    const modPath = resolve(mockDir, entry.name);
    try {
      const mod = await import(pathToFileURL(modPath).href);
      const middleware = mod.default ?? mod;
      if (typeof middleware === 'function') {
        middlewares.use(middleware);
      }
    } catch {
      // skip invalid middleware
    }
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
