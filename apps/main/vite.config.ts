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
  getMainChunkGroupName,
  getMainRuntimeOverrideAliases,
} from '../../scripts/main-bundle-utils.mjs';

const appRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appRoot, '../..');
const mainPackageContext = createMainPackageContext(repoRoot);
const mainExternalPackageAliases = getMainExternalPackageAliases(repoRoot);
const mainRuntimeOverrideAliases = getMainRuntimeOverrideAliases(repoRoot);

async function importPrototypePlugin(dir: string) {
  const { prototypeServerPlugin } = await import('@nop-chaos/vite-plugin-prototype-server');
  return prototypeServerPlugin({ dir });
}

const configFn: import('vite').UserConfigFn = async ({ mode }) => {
  const analyze = mode === 'analyze';
  const env = loadEnv(mode, appRoot, '');
  const extensionAliasPath = env.VITE_DEMO_EXTENSION_ALIAS_PATH;
  const aliasedExtensionPath = extensionAliasPath
    ? resolve(appRoot, extensionAliasPath)
    : undefined;
  const prototypeDir = env.VITE_PROTOTYPE_DIR;
  const prototypeExtensionEntry = env.VITE_PROTOTYPE_EXTENSION_ENTRY;
  const prototypeExtensionResolved = prototypeExtensionEntry
    ? resolve(appRoot, prototypeExtensionEntry)
    : undefined;

  return {
    base: './',
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
        ...(prototypeExtensionResolved
          ? [
              {
                find: '@prototype-extension',
                replacement: prototypeExtensionResolved,
              },
            ]
          : []),
      ],
    },
    optimizeDeps: {
      exclude: ['@nop-chaos/flux'],
    },
    plugins: [
      tailwindcss(),
      react(),
      babel({ presets: [reactCompilerPreset({ target: '19' })] }),
      ...(prototypeDir ? [await importPrototypePlugin(prototypeDir)] : []),
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
      fs:
        aliasedExtensionPath || prototypeExtensionResolved
          ? {
              allow: [
                appRoot,
                repoRoot,
                ...(aliasedExtensionPath ? [dirname(aliasedExtensionPath)] : []),
                ...(prototypeExtensionResolved ? [dirname(prototypeExtensionResolved)] : []),
              ],
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
                  return getMainChunkGroupName(id, mainPackageContext) ?? null;
                },
              },
            ],
          },
        },
      },
    },
  };
};

export default defineConfig(configFn);
