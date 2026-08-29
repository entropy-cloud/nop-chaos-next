import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { hostShellPlugin } from './extension-host-shell-plugin.mjs';

/**
 * dev: real Java backend mode.
 *
 * Requires a nop-entropy backend running on http://127.0.0.1:8080 to
 * serve /r/* /api/* /graphql etc. The host's vite proxy (configured in
 * apps/main/vite.config.ts and baked into the dist build) forwards
 * these calls from the browser to the backend.
 *
 * Run:
 *   1. cd ../nop-entropy && ./gradlew quarkusDev
 *      (or however the backend is started locally — see the backend repo)
 *   2. pnpm dev
 *   3. open http://localhost:4180/
 */
export default defineConfig({
  base: './',
  resolve: { tsconfigPaths: true },
  plugins: [react(), ...hostShellPlugin({ entry: '/src/index.ts' })],
  server: { cors: true, port: 4180, strictPort: false },
  preview: { port: 4180 },
});