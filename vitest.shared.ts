import { defineConfig } from 'vitest/config';

interface SharedVitestConfigOptions {
  environment?: 'node' | 'jsdom' | 'happy-dom';
}

export function createSharedVitestConfig(options: SharedVitestConfigOptions = {}) {
  return defineConfig({
    test: {
      environment: options.environment ?? 'node',
      pool: 'forks',
      include: ['**/*.{test,spec}.ts', '**/*.{test,spec}.tsx'],
      exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
    },
  });
}
