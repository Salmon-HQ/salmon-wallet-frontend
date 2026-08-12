import { configDefaults, defineConfig } from 'vitest/config'
import { WxtVitest } from 'wxt/testing/vitest-plugin'
import path from 'path'

export default defineConfig({
  plugins: [WxtVitest()],
  resolve: {
    alias: {
      '@salmon/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@salmon/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // First render of the MUI-heavy trees takes >5s on cold 2-core CI
    // runners; the default 5s timeout flakes there while meaning nothing
    // locally.
    testTimeout: 20000,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    // Playwright E2E specs have their own runner (`pnpm e2e`); Vitest must not load them.
    exclude: [...configDefaults.exclude, '.playwright/**'],
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
