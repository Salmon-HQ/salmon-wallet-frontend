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
      '@salmon/shared/powerups': fileURLToPath(
        new URL('../shared/src/powerups/index.ts', import.meta.url)
      ),
      // The `@salmon/shared` barrel reaches `react-native` through its storage
      // adapter. RN ships Flow, which Vitest's transform cannot parse, and this
      // package never renders RN — so the module resolves to an empty stub and
      // a kit test can import the real tokens, contexts and contracts.
      'react-native': fileURLToPath(new URL('./src/test/react-native-stub.ts', import.meta.url)),
    },
  },
  test: {
    // First render of the MUI-heavy component trees takes >5s on cold 2-core
    // CI runners; the default 5s timeout flakes there while meaning nothing
    // locally.
    testTimeout: 20000,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Ratchet: floors sit just under the measured coverage (2026-09-09) and
      // only ever move up. A PR that drops below fails CI.
      thresholds: { statements: 81, branches: 71, functions: 78, lines: 83 },
    },
  },
});
