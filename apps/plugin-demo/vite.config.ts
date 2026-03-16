import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

const entry = resolve(__dirname, 'src/index.tsx')

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 4174
  },
  preview: {
    port: 4174
  },
  build: {
    lib: {
      entry,
      fileName: () => 'plugin-demo.system.js',
      formats: ['system']
    },
    outDir: 'dist',
    rollupOptions: {
      external: [
        '@nop-chaos/plugin-bridge',
        '@nop-chaos/shared',
        '@nop-chaos/ui',
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react-router-dom',
        '@tanstack/react-query',
        'zustand',
        'i18next',
        'react-i18next',
        'lucide-react',
        'recharts',
        'sonner'
      ]
    }
  }
})
