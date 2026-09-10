module.exports = {
  preset: 'jest-expo',
  silent: true,
  // Tests that derive accounts run real PBKDF2; on cold 2-core CI runners
  // that blows past Jest's default 5s per-test timeout while meaning nothing
  // locally. Same headroom as the Vitest configs.
  testTimeout: 20000,
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@salmon/.*|@solana/.*|phosphor-react-native/.*|decode-uri-component|.pnpm/.*)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // The Powerups entry is a subpath the package does not publish; the
    // bundlers alias it (see metro.config.js), so the tests map it the same way.
    '^@salmon/shared/powerups$': '<rootDir>/../../packages/shared/src/powerups',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  // Ratchet: floors sit just under the measured coverage (2026-09-09) and
  // only ever move up. A PR that drops below fails CI.
  coverageThreshold: {
    global: { statements: 75, branches: 64, functions: 65, lines: 77 },
  },
};
