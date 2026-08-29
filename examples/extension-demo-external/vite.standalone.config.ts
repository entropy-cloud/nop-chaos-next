import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone preview: serves only this extension's UI without the host.
// Use when HOST_DIST is not available or you want to iterate on UI in
// isolation.
export default defineConfig({
  root: 'src/standalone',
  base: './',
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  server: { port: 4180, strictPort: false },
});
