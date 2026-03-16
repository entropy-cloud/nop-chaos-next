import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

function includesAny(id: string, segments: string[]) {
  return segments.some((segment) => id.includes(segment))
}

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 4173
  },
  preview: {
    port: 4173
  },
  build: {
    sourcemap: true,
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
