import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const entry = resolve(__dirname, 'src/index.tsx')

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  plugins: [react()],
  server: {
    port: 4174
  },
  preview: {
    port: 4174
  }
})
