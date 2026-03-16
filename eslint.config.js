import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'playwright-report', 'test-results']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    }
  },
  {
    files: [
      'packages/ui/src/components/ui/badge.tsx',
      'packages/ui/src/components/ui/button-group.tsx',
      'packages/ui/src/components/ui/button.tsx',
      'packages/ui/src/components/ui/combobox.tsx',
      'packages/ui/src/components/ui/direction.tsx',
      'packages/ui/src/components/ui/form.tsx',
      'packages/ui/src/components/ui/navigation-menu.tsx',
      'packages/ui/src/components/ui/sidebar.tsx',
      'packages/ui/src/components/ui/sonner.tsx',
      'packages/ui/src/components/ui/tabs.tsx',
      'packages/ui/src/components/ui/toggle.tsx',
      'apps/main/src/router/pageRegistry.tsx'
    ],
    rules: {
      'react-refresh/only-export-components': 'off'
    }
  },
  prettier
)
