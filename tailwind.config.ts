import type { Config } from 'tailwindcss';
import { createNopTailwindPreset } from './packages/tailwind-preset/src';
import { fluxHostTokenExtension } from './apps/main/src/styles/fluxHostTailwindExtension';

const config: Config = {
  presets: [createNopTailwindPreset(fluxHostTokenExtension.tailwindThemeExtension)],
  content: [
    './apps/main/index.html',
    './apps/main/src/**/*.{ts,tsx}',
    './examples/plugin-demo/src/**/*.{ts,tsx}',
    './packages/core/src/**/*.{ts,tsx}',
  ],
};

export default config;
