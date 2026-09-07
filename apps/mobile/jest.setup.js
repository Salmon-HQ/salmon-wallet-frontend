import '@testing-library/react-native/pure';

// The launch update gate holds the first render until it has decided. Under
// Jest there is no update server, so it is disabled by default and the app
// renders immediately — the gate has its own tests
// (`src/updates/useMandatoryUpdate.test.tsx`), which override this.
jest.mock('expo-updates', () => ({
  __esModule: true,
  isEnabled: false,
  checkForUpdateAsync: jest.fn(async () => ({ isAvailable: false })),
  fetchUpdateAsync: jest.fn(async () => ({ isNew: false })),
  reloadAsync: jest.fn(async () => {}),
}));
