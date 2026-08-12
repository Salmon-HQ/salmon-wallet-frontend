module.exports = {
  preset: 'jest-expo',
  silent: true,
  // Tests that derive accounts run real PBKDF2; on cold 2-core CI runners
  // that blows past Jest's default 5s per-test timeout while meaning nothing
  // locally. Same headroom as the Vitest configs.
  testTimeout: 20000,
  setupFilesAfterEnv: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@salmon/.*|@solana/.*|.pnpm/.*)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
}
