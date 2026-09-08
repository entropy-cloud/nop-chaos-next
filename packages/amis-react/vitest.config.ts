import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      'monaco-editor': resolve(__dirname, 'src/__mocks__/monaco-editor.ts'),
    },
  },
  test: {
    environment: 'happy-dom',
    pool: 'forks',
    include: ['**/*.{test,spec}.ts', '**/*.{test,spec}.tsx'],
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
  },
});
