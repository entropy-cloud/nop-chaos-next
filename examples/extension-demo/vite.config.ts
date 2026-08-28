import { resolve } from 'node:path';
import { writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { defineConfig, type Plugin, type ResolvedConfig } from 'vite';
import react from '@vitejs/plugin-react';

interface ManifestPluginOptions {
  id: string;
  name: string;
  version?: string;
}

/**
 * Collect every static asset referenced via "new URL('./xxx', import.meta.url)"
 * from src/index.ts, plus the entry chunk and bundled CSS, into a single
 * extension.json manifest.
 *
 * Why this exists
 * ---------------
 * Vite by default does NOT emit assets that are referenced only via
 * "new URL('./xxx', import.meta.url)" literal strings (because the bundler
 * cannot statically tell whether the resolved URL string is consumed at
 * runtime). To make per-extension assets (harbor-mark.svg, harbor.css,
 * shell.css, component-page.css, etc.) actually land on disk alongside
 * extension.json, this plugin scans the entry source for new URL literals,
 * copies the referenced files into dist/assets/, and records their paths
 * in the manifest.
 *
 * Manifest shape
 * --------------
 * The Java IndexHtmlProvider (in
 * nop-entropy-master/nop-frontend-support/nop-web) consumes this manifest
 * via the extension/{name}/extension.json scan in production deploys; the
 * host front-end reads the same file after the DOM-scan bootstrap in
 * apps/main/src/extensions/config.ts.
 *
 *   - id / name / version: extension metadata.
 *   - entry: relative path from extension.json to the ESM entry chunk that
 *     exports the ShellExtension (via export default, export const, or
 *     getExtension()).
 *   - styleAssets: relative paths to CSS files that the host should inject
 *     as <link rel="stylesheet"> (Java contract) or load via the
 *     extension.json-driven server render in production.
 *   - assets: relative paths to non-CSS static assets (SVG, fonts, JSON,
 *     etc.) that the extension references through new URL. The extension
 *     runtime ShellExtension then points to these via absolute URLs after
 *     the host prefixes them with the data-nop-extension-id path.
 */
function extensionManifestPlugin(options: ManifestPluginOptions): Plugin {
  const collectedAssets = new Set<string>();
  let resolvedConfig: ResolvedConfig | null = null;

  function scanUrlLiteralsFromSource(source: string): string[] {
    const out: string[] = [];
    const re = /new\s+URL\(\s*(['"])((?:\\.|(?!\1).)*)\1\s*,\s*import\.meta\.url\s*\)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(source)) !== null) {
      out.push(match[2]);
    }
    return out;
  }

  function hash(input: string): string {
    let h = 0;
    for (let i = 0; i < input.length; i += 1) {
      h = (h * 31 + input.charCodeAt(i)) | 0;
    }
    return '_' + Math.abs(h).toString(36).slice(0, 8);
  }

  function hashedAssetName(absPath: string): string {
    const base = absPath.split('/').pop() ?? absPath;
    const dot = base.lastIndexOf('.');
    const name = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot) : '';
    return `${name}-${hash(absPath)}${ext}`;
  }

  return {
    name: 'extension-manifest',
    apply: 'build',

    configResolved(config) {
      resolvedConfig = config;
    },

    /**
     * Hook the entry source to extract every new URL literal.
     */
    async transform(code, id) {
      if (!resolvedConfig) {
        return null;
      }
      const entryAbs = resolve(resolvedConfig.root, 'src/index.ts');
      if (id !== entryAbs) {
        return null;
      }

      const literals = scanUrlLiteralsFromSource(code);
      for (const literal of literals) {
        const cleaned = literal.replace(/^\.\.?\//, '');
        const assetAbs = resolve(resolvedConfig.root, 'src', cleaned);
        if (existsSync(assetAbs)) {
          collectedAssets.add(assetAbs);
        }
      }

      return null;
    },

    /**
     * After Vite has finished emitting the bundle, copy each per-extension
     * asset into dist/assets/<name>-<hash><ext> and record its public path.
     * We use the same naming scheme as Vite's assetFileNames so the host
     * sees consistent hashed names.
     */
    closeBundle() {
      if (!resolvedConfig) {
        return;
      }
      const outDir = resolvedConfig.build.outDir;
      const assetsDir = resolve(outDir, 'assets');
      mkdirSync(assetsDir, { recursive: true });

      for (const abs of collectedAssets) {
        const fileName = hashedAssetName(abs);
        const dest = resolve(assetsDir, fileName);
        if (!existsSync(dest)) {
          copyFileSync(abs, dest);
        }
      }
    },

    writeBundle(outputOptions, bundle) {
      if (!resolvedConfig) {
        return;
      }

      let entry: string | undefined;
      const styleAssets: string[] = [];
      const bundledAssets = new Set<string>();

      if (bundle) {
        for (const [fileName, output] of Object.entries(bundle)) {
          const ref = output as { type?: string; isEntry?: boolean };
          if (ref.type === 'chunk' && ref.isEntry) {
            entry = `./${fileName}`;
          }
          if (ref.type === 'asset' && fileName.endsWith('.css')) {
            styleAssets.push(`./${fileName}`);
          }
          if (ref.type === 'asset') {
            bundledAssets.add(`./${fileName}`);
          }
        }
      }

      const hashedNames = new Set<string>();
      const assets: string[] = [];
      for (const abs of collectedAssets) {
        const fileName = `./assets/${hashedAssetName(abs)}`;
        hashedNames.add(fileName);
        if (fileName.endsWith('.css')) {
          if (!styleAssets.includes(fileName)) {
            styleAssets.push(fileName);
          }
        } else if (bundledAssets.has(fileName)) {
          continue;
        } else {
          assets.push(fileName);
        }
      }

      if (!entry) {
        return;
      }

      const manifest = {
        id: options.id,
        name: options.name,
        ...(options.version ? { version: options.version } : {}),
        entry,
        ...(styleAssets.length > 0 ? { styleAssets } : {}),
        ...(assets.length > 0 ? { assets } : {}),
      };

      const outDir = outputOptions.dir ?? 'dist';
      writeFileSync(
        resolve(outDir, 'extension.json'),
        JSON.stringify(manifest, null, 2) + '\n',
      );
    },
  };
}

const productionConfig = defineConfig({
  base: './',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    react(),
    extensionManifestPlugin({
      id: 'example-extension-demo',
      name: 'Harbor Operations Suite',
      version: '0.0.1',
    }),
  ],
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    sourcemap: false,
    minify: 'esbuild',
    modulePreload: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/index.ts'),
      output: {
        format: 'es',
        entryFileNames: 'assets/index.js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        extend: false,
      },
      preserveEntrySignatures: 'exports-only',
    },
  },
});

const devConfig = defineConfig({
  base: './',
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [react()],
  server: {
    cors: true,
    origin: 'http://127.0.0.1:4180',
    port: 4180,
    strictPort: false,
  },
  preview: {
    port: 4180,
    strictPort: false,
  },
});

export default defineConfig(({ command, mode }) => {
  // command: 'serve' (dev) | 'build' (build). mode: 'development' | 'production' | 'preview' | custom.
  // Use command for routing dev vs build so preview/production modes still go through the
  // library build (the extension is not a standalone HTML app in production).
  if (command === 'serve') {
    return devConfig;
  }
  return productionConfig;
});