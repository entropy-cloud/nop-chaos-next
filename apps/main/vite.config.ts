import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import {
  createMainPackageContext,
  getMainExternalPackageAliases,
  getPackageChunkName,
} from '../../scripts/main-bundle-utils.mjs';

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appRoot, '../..');
const mainPackageContext = createMainPackageContext(repoRoot);
const mainExternalPackageAliases = getMainExternalPackageAliases(repoRoot);

function includesAny(id: string, segments: string[]) {
  return segments.some((segment) => id.includes(segment));
}

function normalizeId(id: string) {
  return id.replace(/\\/g, '/');
}

function getNodeModulePackageName(id: string) {
  const normalized = normalizeId(id);
  const marker = '/node_modules/';
  const index = normalized.lastIndexOf(marker);

  if (index < 0) {
    return undefined;
  }

  const remainder = normalized.slice(index + marker.length);
  const [first, second] = remainder.split('/');

  if (!first) {
    return undefined;
  }

  if (first.startsWith('@') && second) {
    return `${first}/${second}`;
  }

  return first;
}

function getHostRuntimeChunkName(id: string) {
  const normalized = normalizeId(id);

  if (includesAny(normalized, ['/src/main.tsx', '/src/App.tsx'])) {
    return 'host-entry';
  }

  if (includesAny(normalized, ['/src/amis/init.ts', '/src/amis/xuiComponents.ts'])) {
    return 'host-amis-bootstrap';
  }

  if (includesAny(normalized, ['/src/amis/adapter.ts', '/src/amis/providers.ts'])) {
    return 'host-amis-adapter';
  }

  if (includesAny(normalized, ['/src/amis/testSchema.ts'])) {
    return 'host-amis-preview';
  }

  if (includesAny(normalized, ['/src/amis/AmisRouteRenderer'])) {
    return 'host-amis-route-runtime';
  }

  if (
    includesAny(normalized, [
      '/src/router/AppRoutes',
      '/src/router/RouteRenderer',
      '/src/router/pageRegistry',
      '/src/plugins/',
      '/src/components/layout/',
    ])
  ) {
    return 'host-shell-runtime';
  }

  if (includesAny(normalized, ['/src/config/', '/src/extensions/'])) {
    return 'host-config-runtime';
  }

  if (
    includesAny(normalized, [
      '/src/services/',
      '/src/store/',
      '/src/hooks/',
      '/src/components/auth/',
      '/src/components/plugin/',
      '/src/lib/',
    ])
  ) {
    return 'host-app-runtime';
  }

  return 'host-runtime-misc';
}

export default defineConfig(({ mode }) => {
  const analyze = mode === 'analyze';
  const env = loadEnv(mode, appRoot, '');
  const extensionAliasPath = env.VITE_DEMO_EXTENSION_ALIAS_PATH;
  const aliasedExtensionPath = extensionAliasPath
    ? resolve(appRoot, extensionAliasPath)
    : undefined;

  return {
    resolve: {
      tsconfigPaths: true,
      alias: [
        ...mainExternalPackageAliases,
        ...(aliasedExtensionPath
          ? [
              {
                find: '@demo-extension',
                replacement: aliasedExtensionPath,
              },
            ]
          : []),
      ],
    },
    plugins: [
      tailwindcss(),
      react(),
      babel({ presets: [reactCompilerPreset({ target: '19' })] }),
      analyze
        ? visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
            template: 'treemap',
          })
        : null,
    ].filter(Boolean),
    server: {
      port: 4173,
      strictPort: false,
      fs: aliasedExtensionPath
        ? {
            allow: [appRoot, dirname(aliasedExtensionPath)],
          }
        : undefined,
      proxy: {
        '/r': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '/graphql': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '^/p/': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '^/f/': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
        '^/q/': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
    build: {
      sourcemap: false,
      cssMinify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalized = normalizeId(id);

            if (normalized.includes('/src/router/AppShell')) {
              return 'shell-core';
            }

            if (
              includesAny(normalized, [
                '/src/pages/help/',
                '/src/pages/settings/',
                '/src/pages/plugins/',
                '/src/pages/data-management/',
              ])
            ) {
              return 'page-secondary';
            }

            if (
              includesAny(normalized, [
                '/src/pages/dashboard/',
                '/src/components/common/MetricCard',
              ])
            ) {
              return 'page-dashboard';
            }

            if (includesAny(normalized, ['/src/pages/flow-editor/'])) {
              return 'page-flow-editor';
            }

            if (includesAny(normalized, ['/src/pages/ai-workbench/'])) {
              return 'page-ai-workbench';
            }

            const packageEntry = mainPackageContext.resolvePackageEntryByFile(id);

            if (packageEntry && packageEntry.name !== '@nop-chaos/main') {
              return getPackageChunkName(packageEntry.name);
            }

            if (
              includesAny(normalized, [
                '/src/main.tsx',
                '/src/App.tsx',
                '/src/amis/',
                '/src/components/common/',
                '/src/components/plugin/',
                '/src/components/layout/',
                '/src/components/auth/',
                '/src/config/',
                '/src/extensions/',
                '/src/hooks/',
                '/src/lib/',
                '/src/plugins/',
                '/src/router/AppRoutes',
                '/src/router/RouteRenderer',
                '/src/router/pageRegistry',
                '/src/services/',
                '/src/store/',
              ])
            ) {
              return getHostRuntimeChunkName(normalized);
            }

            if (!id.includes('node_modules')) {
              return undefined;
            }

            const nodeModulePackageName = getNodeModulePackageName(id);

            if (!nodeModulePackageName) {
              return 'vendor-misc';
            }

            return getPackageChunkName(nodeModulePackageName);
          },
        },
      },
    },
  };
});
