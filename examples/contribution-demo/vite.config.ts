import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const entry = resolve(__dirname, 'src/index.ts')

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  plugins: [react()],
  server: {
    port: 4180
  },
  preview: {
    port: 4180
  },
  build: {
    lib: {
      entry,
      fileName: () => 'contribution-demo.js',
      formats: ['es']
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['@nop-chaos/shared', 'react', 'react/jsx-runtime']
    }
  }
})
