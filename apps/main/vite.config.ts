import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'
import compressPlugin from 'vite-plugin-compression'

const appRoot = dirname(fileURLToPath(import.meta.url))

function includesAny(id: string, segments: string[]) {
  return segments.some((segment) => id.includes(segment))
}

function normalizeId(id: string) {
  return id.replace(/\\/g, '/')
}

function getNodeModulePackageName(id: string) {
  const normalized = normalizeId(id)
  const marker = '/node_modules/'
  const index = normalized.lastIndexOf(marker)

  if (index < 0) {
    return undefined
  }

  const remainder = normalized.slice(index + marker.length)
  const [first, second] = remainder.split('/')

  if (!first) {
    return undefined
  }

  if (first.startsWith('@') && second) {
    return `${first}/${second}`
  }

  return first
}

function getWorkspacePackageName(id: string) {
  const normalized = normalizeId(id)
  const match = normalized.match(/\/packages\/([^/]+)\//)

  if (!match) {
    return undefined
  }

  return `@nop-chaos/${match[1]}`
}

function toChunkName(prefix: string, packageName: string) {
  return `${prefix}-${packageName.replace(/^@/, '').replace(/\//g, '-').replace(/\./g, '-')}`
}

function getWorkspaceChunkName(packageName: string) {
  if (packageName === '@nop-chaos/ui') {
    return 'pkg-ui'
  }

  if (packageName === '@nop-chaos/core') {
    return 'pkg-core'
  }

  if (packageName === '@nop-chaos/shared') {
    return 'pkg-shared'
  }

  if (packageName === '@nop-chaos/plugin-bridge') {
    return 'pkg-plugin-bridge'
  }

  return toChunkName('pkg', packageName)
}

function getHostRuntimeChunkName(id: string) {
  const normalized = normalizeId(id)

  if (includesAny(normalized, ['/src/main.tsx', '/src/App.tsx'])) {
    return 'host-entry'
  }

  if (includesAny(normalized, ['/src/amis/init.ts', '/src/amis/xuiComponents.ts'])) {
    return 'host-amis-bootstrap'
  }

  if (includesAny(normalized, ['/src/amis/adapter.ts', '/src/amis/providers.ts'])) {
    return 'host-amis-adapter'
  }

  if (includesAny(normalized, ['/src/amis/testSchema.ts'])) {
    return 'host-amis-preview'
  }

  if (includesAny(normalized, ['/src/amis/AmisRouteRenderer'])) {
    return 'host-amis-route-runtime'
  }

  if (includesAny(normalized, ['/src/router/AppRoutes', '/src/router/RouteRenderer', '/src/router/pageRegistry', '/src/plugins/', '/src/components/layout/'])) {
    return 'host-shell-runtime'
  }

  if (includesAny(normalized, ['/src/config/', '/src/extensions/'])) {
    return 'host-config-runtime'
  }

  if (includesAny(normalized, ['/src/services/', '/src/store/', '/src/hooks/', '/src/components/auth/'])) {
    return 'host-app-runtime'
  }

  return 'host-runtime-misc'
}

function getVendorChunkName(packageName: string) {
  if (packageName === 'amis') {
    return 'vendor-amis'
  }

  if (packageName === 'office-viewer') {
    return 'vendor-office-viewer'
  }

  if (packageName === 'amis-ui') {
    return 'vendor-amis-ui'
  }

  if (packageName === 'amis-formula') {
    return 'vendor-amis-formula'
  }

  if (packageName === 'monaco-editor' || packageName.startsWith('@codingame/')) {
    return 'vendor-monaco-editor'
  }

  if (packageName === 'codemirror' || packageName.startsWith('@codemirror/') || packageName.startsWith('@lezer/')) {
    return 'vendor-codemirror'
  }

  if (packageName === 'echarts' || packageName === 'zrender' || packageName === 'echarts-wordcloud') {
    return 'vendor-echarts'
  }

  if (packageName === 'react' || packageName === 'react-dom' || packageName === 'scheduler') {
    return 'vendor-react'
  }

  if (packageName === 'react-router' || packageName === 'react-router-dom' || packageName === 'history') {
    return 'vendor-react-router'
  }

  if (packageName.startsWith('@tanstack/')) {
    return 'vendor-tanstack-react-query'
  }

  if (packageName === 'i18next' || packageName === 'react-i18next' || packageName === 'i18next-browser-languagedetector' || packageName === 'i18next-http-backend') {
    return 'vendor-i18next'
  }

  if (packageName === 'systemjs') {
    return 'vendor-systemjs'
  }

  if (packageName === 'recharts') {
    return 'vendor-recharts'
  }

  if (packageName === '@xyflow/react') {
    return 'vendor-xyflow-react'
  }

  if (packageName === 'markdown-it' || packageName === 'markdown-it-html5-media' || packageName === 'linkify-it' || packageName === 'mdurl' || packageName === 'uc.micro' || packageName === 'punycode') {
    return 'vendor-markdown-it'
  }

  if (packageName === 'jsbarcode') {
    return 'vendor-jsbarcode'
  }

  if (packageName === 'react-color' || packageName === 'reactcss' || packageName === 'tinycolor2' || packageName === 'material-colors') {
    return 'vendor-react-color'
  }

  if (packageName === 'tinymce') {
    return 'vendor-tinymce'
  }

  if (packageName === 'froala-editor') {
    return 'vendor-froala-editor'
  }

  if (packageName === 'react-pdf' || packageName === 'make-cancellable-promise' || packageName === 'make-event-props') {
    return 'vendor-react-pdf'
  }

  if (packageName === 'react-cropper' || packageName === 'cropperjs') {
    return 'vendor-react-cropper'
  }

  if (packageName === 'react-json-view') {
    return 'vendor-react-json-view'
  }

  if (packageName === 'lodash' || packageName === 'lodash-es') {
    return 'vendor-lodash'
  }

  if (packageName === 'exceljs' || packageName === 'xlsx' || packageName === 'pdfjs-dist' || packageName === 'hls.js' || packageName === 'mpegts.js' || packageName === 'sonner' || packageName === 'lucide-react' || packageName === 'zustand' || packageName === '@fortawesome/fontawesome-free') {
    return toChunkName('vendor', packageName)
  }

  return 'vendor-misc'
}

export default defineConfig(({ mode }) => {
  const analyze = mode === 'analyze'
  const env = loadEnv(mode, appRoot, '')
  const extensionAliasPath = env.VITE_DEMO_EXTENSION_ALIAS_PATH
  const aliasedExtensionPath = extensionAliasPath
    ? resolve(appRoot, extensionAliasPath)
    : undefined

  return {
    resolve: {
      tsconfigPaths: true,
      alias: aliasedExtensionPath
        ? [
            {
              find: '@demo-extension',
              replacement: aliasedExtensionPath
            }
          ]
        : undefined
    },
    plugins: [
      tailwindcss(),
      react(),
      babel({ presets: [reactCompilerPreset({ target: '19' })] }),
      compressPlugin({
        ext: '.gz',
        threshold: 1024 * 100,
        filter(file) {
          const normalized = normalizeId(file)
          return normalized.endsWith('.js') && normalized.includes('/assets/')
        },
      }),
      analyze
        ? visualizer({
            filename: 'dist/stats.html',
            gzipSize: true,
            brotliSize: true,
            template: 'treemap'
          })
        : null
    ].filter(Boolean),
    server: {
      port: 4173,
      strictPort: false,
      fs: aliasedExtensionPath
        ? {
            allow: [appRoot, dirname(aliasedExtensionPath)]
          }
        : undefined,
      proxy: {
        '/r': {
          target: 'http://localhost:8080',
          changeOrigin: true
        },
        '/graphql': {
          target: 'http://localhost:8080',
          changeOrigin: true
        },
        '^/p/': {
          target: 'http://localhost:8080',
          changeOrigin: true
        },
        '^/f/': {
          target: 'http://localhost:8080',
          changeOrigin: true
        },
        '^/q/': {
          target: 'http://localhost:8080',
          changeOrigin: true
        }
      }
    },
    preview: {
      port: 4173,
      strictPort: true
    },
    build: {
      sourcemap: true,
      cssMinify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalized = normalizeId(id)

            if (normalized.includes('/src/router/AppShell')) {
              return 'shell-core'
            }

            if (includesAny(normalized, ['/src/pages/help/', '/src/pages/settings/', '/src/pages/plugins/', '/src/pages/data-management/'])) {
              return 'page-secondary'
            }

            if (includesAny(normalized, ['/src/pages/dashboard/', '/src/components/common/MetricCard'])) {
              return 'page-dashboard'
            }

            if (includesAny(normalized, ['/src/pages/flow-editor/'])) {
              return 'page-flow-editor'
            }

            if (includesAny(normalized, ['/src/pages/ai-workbench/'])) {
              return 'page-ai-workbench'
            }

            if (includesAny(normalized, ['/src/components/plugin/'])) {
              return 'page-secondary'
            }

            if (
              includesAny(normalized, [
                '/src/main.tsx',
                '/src/App.tsx',
                '/src/amis/',
                '/src/components/layout/',
                '/src/components/auth/',
                '/src/config/',
                '/src/extensions/',
                '/src/hooks/',
                '/src/plugins/',
                '/src/router/AppRoutes',
                '/src/router/RouteRenderer',
                '/src/router/pageRegistry',
                '/src/services/',
                '/src/store/'
              ])
            ) {
              return getHostRuntimeChunkName(normalized)
            }

            const workspacePackageName = getWorkspacePackageName(id)

            if (workspacePackageName) {
              if (workspacePackageName === '@nop-chaos/amis-react' || workspacePackageName === '@nop-chaos/amis-core') {
                return 'vendor-amis-bridge'
              }

              return getWorkspaceChunkName(workspacePackageName)
            }

            if (!id.includes('node_modules')) {
              return undefined
            }

            const nodeModulePackageName = getNodeModulePackageName(id)

            if (!nodeModulePackageName) {
              return 'vendor-misc'
            }

            return getVendorChunkName(nodeModulePackageName)
          }
        }
      }
    }
  }
})
