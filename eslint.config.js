import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactCompiler from 'eslint-plugin-react-compiler';
import unicorn from 'eslint-plugin-unicorn';
import i18next from 'eslint-plugin-i18next';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

const reactHooksLatest = reactHooks.configs.flat['recommended-latest'];

const react19RestrictedImports = [
  {
    name: 'react-dom',
    importNames: ['findDOMNode', 'hydrate', 'render', 'unmountComponentAtNode'],
    message:
      'Use React 19 root APIs from react-dom/client instead of legacy react-dom entry points.',
  },
  {
    name: 'react-dom/test-utils',
    message:
      'Use @testing-library/react and modern DOM assertions instead of react-dom/test-utils.',
  },
  {
    name: 'react-test-renderer',
    message: 'Do not reintroduce react-test-renderer into the React 19 workspace baseline.',
  },
  {
    name: 'react-test-renderer/shallow',
    message: 'Shallow rendering is legacy. Use @testing-library/react instead.',
  },
];

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'playwright-report', 'test-results'],
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    settings: {
      react: {
        version: '19.0',
      },
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      react,
      unicorn,
      ...reactHooksLatest.plugins,
      'react-refresh': reactRefresh,
      'react-compiler': reactCompiler,
    },
    rules: {
      'react/jsx-key': 'error',
      'react/jsx-no-comment-textnodes': 'error',
      'react/jsx-no-duplicate-props': 'error',
      'react/jsx-no-constructed-context-values': 'error',
      'react/jsx-no-script-url': 'error',
      'react/jsx-no-target-blank': 'error',
      'react/jsx-no-undef': 'error',
      'react/button-has-type': 'error',
      'react/no-children-prop': 'error',
      'react/no-danger-with-children': 'error',
      'react/no-deprecated': 'error',
      'react/no-direct-mutation-state': 'error',
      'react/no-find-dom-node': 'error',
      'react/no-is-mounted': 'error',
      'react/no-array-index-key': 'error',
      'react/no-render-return-value': 'error',
      'react/no-string-refs': 'error',
      'react/no-unknown-property': 'error',
      ...reactHooksLatest.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react-compiler/react-compiler': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-check': false,
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          'ts-nocheck': true,
          minimumDescriptionLength: 3,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-imports': ['error', { paths: react19RestrictedImports }],
      'no-restricted-properties': [
        'error',
        {
          object: 'ReactDOM',
          property: 'render',
          message: 'Use createRoot(...).render(...) from react-dom/client.',
        },
        {
          object: 'ReactDOM',
          property: 'hydrate',
          message: 'Use hydrateRoot(...) from react-dom/client.',
        },
        {
          object: 'ReactDOM',
          property: 'findDOMNode',
          message: 'findDOMNode is legacy and unsupported in the React 19 workspace baseline.',
        },
        {
          object: 'ReactDOM',
          property: 'unmountComponentAtNode',
          message: 'Use root.unmount() from the React 19 root API instead.',
        },
        {
          object: 'React',
          property: 'createFactory',
          message:
            'React.createFactory is legacy and unsupported in the React 19 workspace baseline.',
        },
      ],
      'no-new-func': 'error',
      'no-eval': 'error',
      'max-lines': ['error', { max: 700, skipBlankLines: true, skipComments: true }],
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: [/^[a-z]{2}-[A-Z]{2}(\.\w+)?$/, /^App\.tsx$/],
        },
      ],
    },
  },
  {
    files: ['flux-lib/ui/src/**/*.{ts,tsx}', 'apps/main/src/router/pageRegistry.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: [
      'apps/main/src/amis/adapter.ts',
      'packages/amis-core/src/**/*.test.ts',
      'packages/amis-core/src/**/*.test.tsx',
    ],
    rules: {
      'no-new-func': 'off',
    },
  },
  {
    files: ['apps/main/src/router/RouteRenderer.tsx'],
    rules: {
      'react-hooks/static-components': 'off',
    },
  },
  {
    files: [
      'packages/ui/src/**/*.{ts,tsx}',
      'packages/core/src/**/*.{ts,tsx}',
      'packages/shared/src/**/*.{ts,tsx}',
      'apps/main/src/**/*.{ts,tsx}',
    ],
    ignores: ['**/*.test.{ts,tsx}', '**/__tests__/**', '**/*.spec.{ts,tsx}'],
    plugins: {
      i18next,
    },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-text-only',
          'jsx-components': {
            exclude: ['Trans', 'code', 'pre', 'Kbd'],
          },
          'jsx-attributes': {
            exclude: [
              'className',
              'class',
              'style',
              'styleName',
              'type',
              'id',
              'name',
              'key',
              'ref',
              'data-testid',
              'data-test-id',
              'testId',
              'data-slot',
              'href',
              'src',
              'srcSet',
              'alt',
              'role',
              'aria-.*',
              'variant',
              'size',
              'color',
              'align',
              'direction',
              'as',
              'asChild',
              'htmlFor',
              'for',
              'autoComplete',
              'autocomplete',
              'inputMode',
              'pattern',
            ],
          },
          words: {
            exclude: ['^[\\s\\d\\W]*$', '^[a-z-]+$', '^nop-.*', '^[A-Z_][A-Z0-9_]*$'],
          },
          callees: {
            exclude: [
              't',
              'i18next.t',
              'i18n.t',
              'useTranslation',
              'console.*',
              'log',
              'warn',
              'error',
              'debug',
              'info',
              'cn',
              'clsx',
              'classNames',
              'cva',
              'require',
              'import',
              'createElement',
              'createRef',
              'Object.*',
              'Array.*',
              'String.*',
              'JSON.*',
              'addEventListener',
              'removeEventListener',
              'querySelector',
              'querySelectorAll',
              'getElementById',
              'setAttribute',
              'getAttribute',
              'removeAttribute',
              'Error',
              'TypeError',
              'RangeError',
            ],
          },
        },
      ],
    },
  },
  prettier,
);
