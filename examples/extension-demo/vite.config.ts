import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { hostShellPlugin } from '../../tools/extension-host-shell-plugin.mjs';

// Single-command dev: serves the built host (apps/main/dist) and injects
// this extension's source. Resolves host dist via:
//   1. HOST_DIST env var
//   2. ../../apps/main/dist (sibling repo layout)
//   3. Falls back to standalone if neither is available
//
// Use pnpm dev:standalone for UI-only preview without the host.
export default defineConfig({
  base: './',
  resolve: { tsconfigPaths: true },
  plugins: [react(), ...hostShellPlugin({ entry: '/src/index.ts' })],
  server: { cors: true, port: 4180, strictPort: false },
  preview: { port: 4180 },
});