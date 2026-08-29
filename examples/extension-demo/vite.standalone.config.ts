import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone preview for extension-demo: serves only the extension's UI
// without the host. Use when HOST_DIST is not available or for isolated
// UI iteration.
export default defineConfig({
  base: './',
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  server: { cors: true, port: 4180, strictPort: false },
  preview: { port: 4180 },
});