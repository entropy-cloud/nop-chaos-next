import { resolve } from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const entry = resolve(__dirname, 'src/index.ts')

function trimTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function createHostShimUrls(hostOrigin: string) {
  const base = trimTrailingSlash(hostOrigin)

  return {
    '@nop-chaos/shared': `${base}/nop-shared/shared.js`,
    '@nop-chaos/plugin-bridge': `${base}/nop-shared/plugin-bridge.js`,
    '@nop-chaos/ui': `${base}/nop-shared/ui.js`,
    react: `${base}/nop-shared/react.js`,
    'react-router-dom': `${base}/nop-shared/react-router-dom.js`,
    'react/jsx-runtime': `${base}/nop-shared/react-jsx-runtime.js`,
    'react/jsx-dev-runtime': `${base}/nop-shared/react-jsx-dev-runtime.js`
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const isHostMode = mode === 'host'
  const hostOrigin = trimTrailingSlash(env.VITE_HOST_APP_ORIGIN || 'http://127.0.0.1:4173')
  const hostShimUrls = createHostShimUrls(hostOrigin)
  const externalIds = new Set(Object.values(hostShimUrls))

  return {
    resolve: {
      tsconfigPaths: true,
      alias: isHostMode
        ? [
            { find: /^@nop-chaos\/shared$/, replacement: hostShimUrls['@nop-chaos/shared'] },
            { find: /^@nop-chaos\/plugin-bridge$/, replacement: hostShimUrls['@nop-chaos/plugin-bridge'] },
            { find: /^@nop-chaos\/ui$/, replacement: hostShimUrls['@nop-chaos/ui'] },
            { find: /^react$/, replacement: hostShimUrls.react },
            { find: /^react-router-dom$/, replacement: hostShimUrls['react-router-dom'] },
            { find: /^react\/jsx-runtime$/, replacement: hostShimUrls['react/jsx-runtime'] },
            { find: /^react\/jsx-dev-runtime$/, replacement: hostShimUrls['react/jsx-dev-runtime'] }
          ]
        : []
    },
    plugins: [react()],
    server: {
      port: 4180
    },
    preview: {
      port: 4180
    },
    build: isHostMode
      ? {
          lib: {
            entry,
            fileName: () => 'sales-ops-demo.host.js',
            formats: ['es']
          },
          outDir: 'dist',
          sourcemap: true,
          rollupOptions: {
            external(id) {
              return externalIds.has(id)
            }
          }
        }
      : undefined
  }
})
