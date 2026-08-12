import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Playwright specs live in .playwright/ and must not run under Vitest.
// The @salmon/shared subpath alias mirrors packages/ui/vitest.config.ts.
export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '.playwright/**'],
  },
  resolve: {
    alias: {
      '@salmon/shared/utils/': fileURLToPath(
        new URL('../../packages/shared/src/utils/', import.meta.url)
      ),
    },
  },
});
