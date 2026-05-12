import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
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
