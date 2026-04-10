import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import reactCompiler from 'eslint-plugin-react-compiler'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

const reactHooksLatest = reactHooks.configs.flat['recommended-latest']

const react19RestrictedImports = [
  {
    name: 'react-dom',
    importNames: ['findDOMNode', 'hydrate', 'render', 'unmountComponentAtNode'],
    message: 'Use React 19 root APIs from react-dom/client instead of legacy react-dom entry points.'
  },
  {
    name: 'react-dom/test-utils',
    message: 'Use @testing-library/react and modern DOM assertions instead of react-dom/test-utils.'
  },
  {
    name: 'react-test-renderer',
    message: 'Do not reintroduce react-test-renderer into the React 19 workspace baseline.'
  },
  {
    name: 'react-test-renderer/shallow',
    message: 'Shallow rendering is legacy. Use @testing-library/react instead.'
  }
]

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
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      ...reactHooksLatest.plugins,
      'react-refresh': reactRefresh,
      'react-compiler': reactCompiler
    },
    rules: {
      ...reactHooksLatest.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-compiler/react-compiler': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-imports': ['error', { paths: react19RestrictedImports }],
      'no-restricted-properties': [
        'error',
        {
          object: 'ReactDOM',
          property: 'render',
          message: 'Use createRoot(...).render(...) from react-dom/client.'
        },
        {
          object: 'ReactDOM',
          property: 'hydrate',
          message: 'Use hydrateRoot(...) from react-dom/client.'
        },
        {
          object: 'ReactDOM',
          property: 'findDOMNode',
          message: 'findDOMNode is legacy and unsupported in the React 19 workspace baseline.'
        },
        {
          object: 'ReactDOM',
          property: 'unmountComponentAtNode',
          message: 'Use root.unmount() from the React 19 root API instead.'
        },
        {
          object: 'React',
          property: 'createFactory',
          message: 'React.createFactory is legacy and unsupported in the React 19 workspace baseline.'
        }
      ],
      'no-new-func': 'error',
      'no-eval': 'error'
    }
  },
  {
    files: [
      'flux-lib/ui/src/**/*.{ts,tsx}',
      'apps/main/src/router/pageRegistry.tsx'
    ],
    rules: {
      'react-refresh/only-export-components': 'off'
    }
  },
  {
    // compileFunction adapter uses new Function intentionally as a sandboxed script evaluator
    files: [
      'apps/main/src/amis/adapter.ts',
      'packages/amis-core/src/**/*.test.ts',
      'packages/amis-core/src/**/*.test.tsx'
    ],
    rules: {
      'no-new-func': 'off'
    }
  },
  {
    // RouteRenderer uses a useMemo-stabilized dynamic component from a runtime registry;
    // react-hooks/static-components is a false positive here since Page is memoized by componentId
    files: ['apps/main/src/router/RouteRenderer.tsx'],
    rules: {
      'react-hooks/static-components': 'off'
    }
  },
  prettier
)
