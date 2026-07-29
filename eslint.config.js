import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

/**
 * Directories whose @solana/web3.js migration to @solana/kit has landed.
 * Add a directory here in the SAME commit that completes its migration — the
 * ratchet is what stops a migrated directory from regressing. Paths are
 * repo-root-relative.
 */
const MIGRATED_DIRS = [];

export default [
  js.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.expo/**',
      '**/.wxt/**',
      '**/android/**',
      '**/ios/**',
    ],
  },
  {
    files: [
      'apps/mobile/index.js',
      'apps/mobile/babel.config.js',
      'apps/mobile/jest.config.js',
      'apps/mobile/metro.config.js',
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        global: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        crypto: 'readonly',
        __DEV__: 'readonly',
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        crypto: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        chrome: 'readonly',
        browser: 'readonly',
        __DEV__: 'readonly',
        Window: 'readonly',
        Document: 'readonly',
        HTMLElement: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        MessageEvent: 'readonly',
        EventTarget: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly',
        Map: 'readonly',
        Set: 'readonly',
        Promise: 'readonly',
        Uint8Array: 'readonly',
        ArrayBuffer: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-undef': 'off', // TypeScript handles this
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        args: 'all',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'off', // Valid pattern for early returns
      'react/no-unescaped-entities': 'off', // Not needed with modern tooling
      '@typescript-eslint/no-require-imports': 'off', // Required for Expo font loading
      '@typescript-eslint/no-empty-object-type': 'off', // Valid for extending types
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/__tests__/**/*.ts',
      '**/__tests__/**/*.tsx',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // The @typescript-eslint variant is required: it is the only one that also
  // catches `import type { … } from '@solana/web3.js'`. The conditional spread
  // keeps the entry inert while MIGRATED_DIRS is empty — a flat-config object
  // with `files: []` is not reliably inert.
  ...(MIGRATED_DIRS.length
    ? [
        {
          files: MIGRATED_DIRS.map((dir) => `${dir}/**/*.{ts,tsx}`),
          plugins: { '@typescript-eslint': typescript },
          rules: {
            '@typescript-eslint/no-restricted-imports': [
              'error',
              { patterns: ['@solana/web3.js'] },
            ],
          },
        },
      ]
    : []),
];
