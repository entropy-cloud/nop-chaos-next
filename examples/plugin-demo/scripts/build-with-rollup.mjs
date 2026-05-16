import { mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';
import esbuild from 'rollup-plugin-esbuild';

const rootDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(rootDir, '..');
const entry = resolve(appRoot, 'src/index.tsx');
const outDir = resolve(appRoot, 'dist');
const outputFile = resolve(outDir, 'plugin-demo.system.js');

console.info(
  '[plugin-demo] This bundle externalizes host-shared runtimes. Build output only works when the host registers matching shared modules before loading the plugin.',
);

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

const bundle = await rollup({
  input: entry,
  external: [
    '@nop-chaos/plugin-bridge',
    '@nop-chaos/shared',
    '@nop-chaos/ui',
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react/jsx-dev-runtime',
    'react-router-dom',
    '@tanstack/react-query',
    'zustand',
    'i18next',
    'react-i18next',
    'lucide-react',
    'recharts',
    'sonner',
  ],
  plugins: [
    esbuild({
      tsconfig: resolve(appRoot, 'tsconfig.json'),
      target: 'es2022',
      jsx: 'automatic',
    }),
  ],
});

await bundle.write({
  file: outputFile,
  format: 'system',
  sourcemap: true,
});

await bundle.close();
