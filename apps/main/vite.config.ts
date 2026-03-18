import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function includesAny(id: string, segments: string[]) {
  return segments.some((segment) => id.includes(segment))
}

export default defineConfig({
  resolve: {
    tsconfigPaths: true
  },
  plugins: [react()],
  server: {
    port: 4173,
    proxy: {
      '/r': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/graphql': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/p': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/f': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/q': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173
  },
  css: {
    transformer: 'postcss'
  },
  build: {
    sourcemap: true,
    cssMinify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/src/router/AppShell')) {
            return 'shell'
          }

          if (includesAny(id, ['/src/pages/dashboard/', '/src/components/common/MetricCard'])) {
            return 'page-dashboard'
          }

          if (includesAny(id, ['/src/pages/flow-editor/'])) {
            return 'page-flow-editor'
          }

          if (includesAny(id, ['/src/pages/ai-workbench/'])) {
            return 'page-ai-workbench'
          }

          if (includesAny(id, ['/src/pages/data-management/'])) {
            return 'page-data-management'
          }

          if (includesAny(id, ['/src/pages/plugins/', '/src/components/plugin/'])) {
            return 'page-plugins'
          }

          if (includesAny(id, ['/src/pages/settings/'])) {
            return 'page-settings'
          }

          if (includesAny(id, ['/src/pages/help/'])) {
            return 'page-help'
          }

          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('systemjs')) {
            return 'systemjs'
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/')
          ) {
            return 'react-vendor'
          }

          if (id.includes('/@tanstack/')) {
            return 'query-vendor'
          }

          if (id.includes('/i18next/') || id.includes('/react-i18next/')) {
            return 'i18n-vendor'
          }

          if (id.includes('/sonner/')) {
            return 'feedback-vendor'
          }

          return undefined
        }
      }
    }
  }
})
