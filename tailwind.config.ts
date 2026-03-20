import type { Config } from 'tailwindcss'
import { nopTailwindPreset } from './packages/tailwind-preset/src'

const config: Config = {
  presets: [nopTailwindPreset],
  content: [
    './apps/main/index.html',
    './apps/main/src/**/*.{ts,tsx}',
    './examples/plugin-demo/src/**/*.{ts,tsx}',
    './packages/ui/src/**/*.{ts,tsx}',
    './packages/core/src/**/*.{ts,tsx}'
  ]
}

export default config
