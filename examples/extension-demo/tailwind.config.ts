import type { Config } from 'tailwindcss';
import { nopTailwindPreset } from '@nop-chaos/tailwind-preset';

const config: Config = {
  presets: [nopTailwindPreset],
  content: ['./src/**/*.{ts,tsx}'],
};

export default config;
