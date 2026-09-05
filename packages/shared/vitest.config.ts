import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests that lock/unlock a vault run real PBKDF2 at the production
    // iteration count; on cold 2-core CI runners a round-trip blows past the
    // default 5s while meaning nothing locally. Same headroom `packages/ui`
    // and `apps/mobile` already carry.
    testTimeout: 20000,
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    onConsoleLog: () => false,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
