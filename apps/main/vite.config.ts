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
  getMainRuntimeOverrideAliases,
} from '../../scripts/main-bundle-utils.mjs';

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appRoot, '../..');
const mainPackageContext = createMainPackageContext(repoRoot);
const mainExternalPackageAliases = getMainExternalPackageAliases(repoRoot);
const mainRuntimeOverrideAliases = getMainRuntimeOverrideAliases(repoRoot);

function includesAny(id: string, segments: string[]) {
  return segments.some((segment) => id.includes(segment));
}

function normalizeId(id: string) {
  return id.replace(/\\/g, '/');
}

function getNodeModulePackageName(id: string) {
  const normalized = normalizeId(id);
  const matches = [...normalized.matchAll(/\/node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/g)];
  const packageName = matches.at(-1)?.[1];

  return packageName || undefined;
}

function getWorkspacePackageChunkByPath(id: string) {
  const normalized = normalizeId(id);

  if (includesAny(normalized, ['/flux-lib/ui/', '/node_modules/@nop-chaos/ui/'])) {
    return 'pkg-ui';
  }

  if (includesAny(normalized, ['/packages/shared/', '/node_modules/@nop-chaos/shared/'])) {
    return 'pkg-shared';
  }

  if (includesAny(normalized, ['/packages/core/', '/node_modules/@nop-chaos/core/'])) {
    return 'pkg-core';
  }

  if (includesAny(normalized, ['/packages/plugin-bridge/', '/node_modules/@nop-chaos/plugin-bridge/'])) {
    return 'pkg-plugin-bridge';
  }

  if (includesAny(normalized, ['/packages/amis-core/', '/packages/amis-react/'])) {
    return 'vendor-amis-bridge';
  }

  if (
    includesAny(normalized, [
      '/packages/amis/esm/renderers/Chart.js',
      '/packages/amis/src/renderers/Chart.tsx',
    ])
  ) {
    return 'vendor-amis-chart';
  }

  if (
    includesAny(normalized, [
      '/packages/amis/esm/renderers/OfficeViewer.js',
      '/packages/amis/src/renderers/OfficeViewer.tsx',
    ])
  ) {
    return 'vendor-amis-office-viewer';
  }

  if (
    includesAny(normalized, [
      '/packages/amis/esm/renderers/PdfViewer.js',
      '/packages/amis/src/renderers/PdfViewer.tsx',
    ])
  ) {
    return 'vendor-amis-pdf-viewer';
  }

  if (
    includesAny(normalized, [
      '/packages/amis/esm/renderers/Form/InputRichText.js',
      '/packages/amis/src/renderers/Form/InputRichText.tsx',
    ])
  ) {
    return 'vendor-amis-rich-text';
  }

  if (
    includesAny(normalized, [
      '/packages/amis/esm/renderers/Json.js',
      '/packages/amis/src/renderers/Json.tsx',
    ])
  ) {
    return 'vendor-amis-json';
  }

  if (
    includesAny(normalized, [
      '/packages/amis/esm/renderers/AMIS.js',
      '/packages/amis/src/renderers/AMIS.tsx',
    ])
  ) {
    return 'vendor-amis-renderer';
  }

  if (includesAny(normalized, ['/packages/office-viewer/', '/node_modules/office-viewer/'])) {
    return 'vendor-office-viewer';
  }

  return undefined;
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

  return 'host-runtime';
}

function getChunkGroupName(id: string) {
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

  const workspacePackageChunk = getWorkspacePackageChunkByPath(normalized);

  if (workspacePackageChunk) {
    return workspacePackageChunk;
  }

  const linkedNodeModulePackageName = getNodeModulePackageName(normalized);

  if (linkedNodeModulePackageName?.startsWith('@nop-chaos/')) {
    return getPackageChunkName(linkedNodeModulePackageName);
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
      '/src/pages/auth/',
      '/src/pages/errors/',
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

  if (!normalized.includes('node_modules')) {
    return undefined;
  }

  const nodeModulePackageName = getNodeModulePackageName(normalized);

  if (!nodeModulePackageName) {
    return 'vendor-misc';
  }

  return getPackageChunkName(nodeModulePackageName);
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
      dedupe: ['react', 'react-dom', 'echarts'],
      alias: [
        ...mainRuntimeOverrideAliases,
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
      rolldownOptions: {
        preserveEntrySignatures: 'allow-extension',
        output: {
          strictExecutionOrder: true,
          codeSplitting: {
            includeDependenciesRecursively: false,
            groups: [
              {
                name(id) {
                  return getChunkGroupName(id) ?? null;
                },
              },
            ],
          },
        },
      },
    },
  };
});
