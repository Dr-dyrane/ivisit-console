const js = require('@eslint/js');
const globals = require('globals');
const react = require('eslint-plugin-react');
const reactHooks = require('eslint-plugin-react-hooks');
const jsxA11y = require('eslint-plugin-jsx-a11y');

// ESLint 9 migration baseline (2026-07-13): existing debt remains visible rather
// than being disabled. Correctness/security rules stay errors; backlog-oriented
// cleanup rules stay warnings until their owning feature slices address them.
module.exports = [
  {
    ignores: [
      'build/**',
      'coverage/**',
      'node_modules/**',
      'src/types/database.ts',
    ],
  },
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'warn',
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'warn',
      'react/no-unknown-property': ['error', { ignore: ['cmdk-input-wrapper'] }],
      'react/no-unescaped-entities': 'warn',
      'react-hooks/exhaustive-deps': 'warn',

      'jsx-a11y/alt-text': 'warn',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',

      'no-case-declarations': 'warn',
      'no-control-regex': 'warn',
      'no-empty': 'warn',
      'no-prototype-builtins': 'warn',
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrors: 'none',
          varsIgnorePattern: '^_',
        },
      ],
      'no-useless-escape': 'warn',
      'no-restricted-properties': [
        'error',
        {
          object: 'req',
          property: 'emergency_type',
          message: 'Use service_type instead of emergency_type.',
        },
        {
          object: 'req',
          property: 'location',
          message: 'Use patient_location instead of location.',
        },
        {
          object: 'req',
          property: 'profiles',
          message: 'Use patient_snapshot instead of profiles.',
        },
        {
          object: 'req',
          property: 'scheduled_at',
          message: 'Use date instead of scheduled_at.',
        },
        {
          object: 'visit',
          property: 'user',
          message: 'Use the normalized patient projection instead of visit.user.',
        },
      ],
    },
  },
  {
    files: ['src/**/*.{test,spec}.{js,jsx}', 'src/**/__tests__/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
