import rootConfig from '../../tailwind.config'
import type { Config } from 'tailwindcss'

const config: Config = {
  ...rootConfig,
  content: ['./index.html', './src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}', '../../packages/core/src/**/*.{ts,tsx}']
}

export default config
