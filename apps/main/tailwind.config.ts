import rootConfig from '../../tailwind.config';
import type { Config } from 'tailwindcss';

const config: Config = {
  ...rootConfig,
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../flux-lib/ui/src/**/*.{ts,tsx}',
    '../../packages/core/src/**/*.{ts,tsx}',
    './node_modules/@nop-chaos/flux/dist/**/*.{js,css}',
  ],
};

export default config;
