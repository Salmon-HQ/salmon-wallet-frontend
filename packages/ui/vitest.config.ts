import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// @salmon/shared publishes only `main: ./src/index.ts`, so deep imports like
// `@salmon/shared/utils/account` resolve through the app bundlers' aliases.
// Vitest has no such alias, and any test touching a component that deep-imports
// fails to resolve before it runs. Map the subpath the same way the apps do.
export default defineConfig({
  resolve: {
    alias: {
      '@salmon/shared/utils/': fileURLToPath(new URL('../shared/src/utils/', import.meta.url)),
    },
  },
});
