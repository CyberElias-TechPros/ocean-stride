// @ts-check
'use strict';

// Read more about the Vite + React + TypeScript + ESLint + Prettier setup:
// https://github.com/cyco130/vite-react-ts-eslint-prettier

const { resolve } = require('node:path');
const path = require('path');

const project = resolve(process.cwd(), 'tsconfig.json');

/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:react-hooks/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:jsx-a11y/recommended',
    'plugin:prettier/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    ecmaFeatures: {
      jsx: true,
    },
    sourceType: 'module',
    project,
  },
  plugins: [
    '@typescript-eslint',
    'import',
    'react',
    'react-hooks',
    'jsx-a11y',
    'prettier',
    'only-warn',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project,
      },
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    react: {
      version: 'detect',
    },
  },
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  ignorePatterns: [
    '*.d.ts',
    'dist',
    'node_modules',
    '.eslintrc.cjs',
    'vite.config.ts',
    'postcss.config.js',
    'tailwind.config.ts',
    'playwright.config.ts',
    'vitest.config.ts',
    'vitest.setup.ts',
  ],
  rules: {
    // Base
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    'no-constant-condition': ['error', { checkLoops: false }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-unused-vars': 'off', // Handled by @typescript-eslint
    'prefer-const': 'warn',
    'prefer-destructuring': 'warn',
    'prefer-template': 'warn',
    'spaced-comment': ['warn', 'always', { markers: ['/'] }],

    // TypeScript
    '@typescript-eslint/ban-ts-comment': 'warn',
    '@typescript-eslint/ban-types': 'warn',
    '@typescript-eslint/consistent-type-imports': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off', // Too verbose
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Too verbose
    '@typescript-eslint/no-empty-function': ['warn', { allow: ['arrowFunctions'] }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/no-non-null-assertion': 'off', // Sometimes needed
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
    ],
    '@typescript-eslint/no-unsafe-argument': 'warn',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn',
    '@typescript-eslint/require-await': 'warn',
    '@typescript-eslint/restrict-template-expressions': 'warn',
    '@typescript-eslint/unbound-method': 'off',

    // React
    'react/no-array-index-key': 'warn',
    'react/no-danger': 'error',
    'react/no-deprecated': 'error',
    'react/no-did-mount-set-state': 'error',
    'react/no-did-update-set-state': 'error',
    'react/no-redundant-should-component-update': 'error',
    'react/no-typos': 'error',
    'react/no-this-in-sfc': 'error',
    'react/no-unknown-property': 'error',
    'react/no-unused-prop-types': 'warn',
    'react/no-unused-state': 'warn',
    'react/prefer-es6-class': 'warn',
    'react/prefer-stateless-function': 'warn',
    'react/prop-types': 'off', // We use TypeScript for prop validation
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    'react/self-closing-comp': 'warn',
    'react/sort-comp': 'off',
    'react/state-in-constructor': ['warn', 'never'],
    'react/static-property-placement': ['warn', 'static public field'],
    'react-hooks/exhaustive-deps': 'warn',

    // JSX
    'react/jsx-boolean-value': ['warn', 'never'],
    'react/jsx-closing-bracket-location': 'warn',
    'react/jsx-closing-tag-location': 'warn',
    'react/jsx-curly-brace-presence': ['warn', { props: 'never', children: 'never' }],
    'react/jsx-curly-newline': 'warn',
    'react/jsx-curly-spacing': 'warn',
    'react/jsx-equals-spacing': 'warn',
    'react/jsx-filename-extension': ['warn', { extensions: ['.tsx', '.jsx'] }],
    'react/jsx-first-prop-new-line': ['warn', 'multiline-multiprop'],
    'react/jsx-fragments': ['warn', 'syntax'],
    'react/jsx-handler-names': 'warn',
    'react/jsx-indent-props': ['warn', 2],
    'react/jsx-indent': ['warn', 2],
    'react/jsx-key': 'error',
    'react/jsx-max-depth': ['warn', { max: 6 }],
    'react/jsx-max-props-per-line': ['warn', { maximum: 3, when: 'multiline' }],
    'react/jsx-no-bind': ['warn', { allowArrowFunctions: true }],
    'react/jsx-no-comment-textnodes': 'warn',
    'react/jsx-no-constructed-context-values': 'warn',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-script-url': 'error',
    'react/jsx-no-target-blank': 'error',
    'react/jsx-no-useless-fragment': 'warn',
    'react/jsx-one-expression-per-line': 'off', // Conflicts with Prettier
    'react/jsx-pascal-case': 'warn',
    'react/jsx-props-no-multi-spaces': 'warn',
    'react/jsx-sort-props': [
      'warn',
      {
        callbacksLast: true,
        shorthandFirst: true,
        multiline: 'last',
        ignoreCase: true,
        reservedFirst: true,
      },
    ],
    'react/jsx-tag-spacing': 'warn',
    'react/jsx-uses-react': 'error',
    'react/jsx-uses-vars': 'error',
    'react/jsx-wrap-multilines': 'warn',

    // Import
    'import/default': 'warn',
    'import/export': 'warn',
    'import/exports-last': 'off',
    'import/extensions': [
      'warn',
      'ignorePackages',
      {
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
        mjs: 'never',
      },
    ],
    'import/first': 'warn',
    'import/group-exports': 'off',
    'import/imports-first': 'warn',
    'import/max-dependencies': 'off',
    'import/named': 'warn',
    'import/namespace': 'warn',
    'import/newline-after-import': 'warn',
    'import/no-absolute-path': 'warn',
    'import/no-commonjs': 'off',
    'import/no-cycle': 'warn',
    'import/no-default-export': 'off',
    'import/no-deprecated': 'warn',
    'import/no-duplicates': 'warn',
    'import/no-dynamic-require': 'warn',
    'import/no-extraneous-dependencies': 'warn',
    'import/no-import-module-exports': 'warn',
    'import/no-internal-modules': 'off',
    'import/no-mutable-exports': 'warn',
    'import/no-named-as-default': 'warn',
    'import/no-named-as-default-member': 'warn',
    'import/no-named-default': 'warn',
    'import/no-namespace': 'off',
    'import/no-nodejs-modules': 'off',
    'import/no-relative-packages': 'warn',
    'import/no-relative-parent-imports': 'off',
    'import/no-self-import': 'error',
    'import/no-unassigned-import': 'off',
    'import/no-unresolved': ['error', { commonjs: true, caseSensitive: true }],
    'import/no-unused-modules': 'off',
    'import/no-useless-path-segments': 'warn',
    'import/no-webpack-loader-syntax': 'warn',
    'import/order': [
      'warn',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before',
          },
        ],
        pathGroupsExcludeImportType: ['react'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
    'import/prefer-default-export': 'off',
    'import/unambiguous': 'off',
  },
  overrides: [
    // Configuration files
    {
      files: ['*.js', '*.cjs'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'import/no-commonjs': 'off',
      },
    },
    // Test files
    {
      files: ['**/__tests__/**/*', '**/*.test.*', '**/*.spec.*'],
      env: {
        jest: true,
        node: true,
      },
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-object-literal-type-assertion': 'off',
        '@typescript-eslint/no-empty-function': 'off',
        'no-magic-numbers': 'off',
      },
    },
    // TypeScript declaration files
    {
      files: ['**/*.d.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        'import/no-duplicates': 'off',
      },
    },
  ],
};
