import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

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
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
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
  // @salmon/ui is DOM-only and must never enter the React Native bundle
  // (AGENTS.md ownership rule). Until now this was prose plus the accident
  // that apps/mobile/tsconfig.json has no path mapping for @salmon/ui; this
  // makes the boundary explicit and lint-enforced.
  // Core no-restricted-imports (not the @typescript-eslint one) on purpose:
  // the block below configures @typescript-eslint/no-restricted-imports for
  // every file, and flat config replaces same-named rules wholesale — a
  // second config of that rule here would clobber one restriction or the
  // other for mobile files.
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@salmon/ui', '@salmon/ui/*'],
              message:
                '@salmon/ui is DOM-only and breaks the native bundle. Use apps/mobile components or the cross-platform contracts in @salmon/shared/types/ui.',
            },
          ],
        },
      ],
    },
  },
  // @solana/web3.js is gone from every production path in this repo. This
  // errors when one comes back, instead of drifting back in one import at a
  // time.
  //
  // Escape hatch on purpose: kit is younger than web3.js and does not cover
  // everything it does. Reaching back for a v1 API is a legitimate answer to
  // a gap, and the person doing it knows more about their case than this rule
  // does. When that happens, add an inline eslint-disable with a one-line
  // justification — it happens on purpose and shows up in review.
  // (These were warnings until lint gained --max-warnings 0, which made
  // "warning" mean "broken build" anyway; error + disable-comment keeps the
  // original intent under that regime.)
  //
  // Tests are exempt entirely: the kit code is verified against web3.js
  // fixtures (the OCMS/SIWS/dApp-approval golden vectors are produced by web3.js
  // and reproduced by kit), and a cross-library oracle is stronger evidence than
  // a self-consistent one. web3.js is a devDependency for exactly that reason.
  //
  // Two rules, not one: no-restricted-imports does not visit TSImportType, so it
  // misses `import('@solana/web3.js').Commitment`. The selector covers that form.
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    plugins: { '@typescript-eslint': typescript },
    rules: {
      '@typescript-eslint/no-restricted-imports': ['error', { patterns: ['@solana/web3.js'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSImportType[source.value="@solana/web3.js"]',
          message: "'@solana/web3.js' import is restricted from being used by a pattern.",
        },
      ],
    },
  },
];
