import { rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { rollup } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'

const rootDir = dirname(fileURLToPath(import.meta.url))
const appRoot = resolve(rootDir, '..')
const entry = resolve(appRoot, 'src/index.tsx')
const outDir = resolve(appRoot, 'dist')
const outputFile = resolve(outDir, 'plugin-demo.system.js')

await rm(outDir, { recursive: true, force: true })

const bundle = await rollup({
  input: entry,
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
  ],
  plugins: [
    esbuild({
      tsconfig: resolve(appRoot, 'tsconfig.json'),
      target: 'es2022',
      jsx: 'automatic'
    })
  ]
})

await bundle.write({
  file: outputFile,
  format: 'system',
  sourcemap: true
})

await bundle.close()
