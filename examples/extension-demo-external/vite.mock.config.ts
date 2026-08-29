import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { hostShellPlugin } from './extension-host-shell-plugin.mjs';

/**
 * dev:mock — local mock APIs (no Java backend required).
 *
 * Requires a host dist that was built WITH mock APIs:
 *
 *   pnpm --filter @nop-chaos/main exec vite build \
 *     --mode devtools-e2e \
 *     && node scripts/build-nop-shared.mjs
 *
 * Then point HOST_DIST_MOCK to the resulting dist/ directory. If
 * unset, falls back to HOST_DIST (dev mode will still work for UI
 * preview, but API calls will fail without the backend).
 *
 * Run:
 *   1. Build host with mock mode (see above)
 *   2. HOST_DIST_MOCK=path/to/mock/dist pnpm dev:mock
 *   3. open http://localhost:4180/   (admin / 123456 to log in)
 */
export default defineConfig({
  base: './',
  resolve: { tsconfigPaths: true },
  plugins: [
    react(),
    ...hostShellPlugin({
      entry: '/src/index.ts',
      // Plugin picks HOST_DIST_MOCK first, then HOST_DIST, then sibling
      // nop-chaos-next dist. We surface this preference at config time so
      // the developer can confirm which dist was chosen.
    }),
  ],
  server: { cors: true, port: 4180, strictPort: false },
  preview: { port: 4180 },
  define: {
    // Hint to the host's runtime that mock mode is in effect (the host
    // dist itself must be built with VITE_ENABLE_MOCK=true for this to
    // have any effect).
    'import.meta.env.VITE_ENABLE_MOCK': JSON.stringify('true'),
  },
});