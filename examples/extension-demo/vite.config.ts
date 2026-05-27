import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

interface ManifestPluginOptions {
  id: string;
  name: string;
  version?: string;
}

function extensionManifestPlugin(options: ManifestPluginOptions): Plugin {
  return {
    name: 'extension-manifest',
    writeBundle(outputOptions, bundle) {
      let entry: string | undefined;
      const styleAssets: string[] = [];

      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type === 'chunk' && output.isEntry) {
          entry = `./${fileName}`;
        }
        if (output.type === 'asset' && fileName.endsWith('.css')) {
          styleAssets.push(`./${fileName}`);
        }
      }

      if (!entry) return;

      const manifest = {
        id: options.id,
        name: options.name,
        ...(options.version ? { version: options.version } : {}),
        entry,
        ...(styleAssets.length > 0 ? { styleAssets } : {}),
      };

      const outDir = outputOptions.dir ?? 'dist';
      writeFileSync(resolve(outDir, 'extension.json'), JSON.stringify(manifest, null, 2) + '\n');
    },
  };
}

export default defineConfig({
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
