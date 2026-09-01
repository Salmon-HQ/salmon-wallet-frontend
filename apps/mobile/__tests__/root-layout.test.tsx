import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import RootLayout from '../app/_layout';

const mockLockAccounts = jest.fn();
const mockUseAccountsContext = jest.fn();

jest.mock('react-native-reanimated', () => ({}));

// The root `GestureHandlerRootView` reaches the native module at import time
// (`_RNGestureHandlerModule.default.install`), which does not exist under
// Jest. Same targeted stand-in `BottomSheetContainer` and `BalanceHeader`
// already use — the root view is real app wiring and must stay in `_layout`.
jest.mock('react-native-gesture-handler', () => {
  const { View: RNView } = jest.requireActual('react-native');
  return { GestureHandlerRootView: RNView };
});

jest.mock('expo-font', () => ({
  useFonts: jest.fn(() => [true, null]),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const MockStack = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  MockStack.Screen = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

  return {
    Stack: MockStack,
    router: { replace: jest.fn() },
    useSegments: jest.fn(() => ['(app)', '(tabs)']),
    useRootNavigationState: jest.fn(() => ({ key: 'root' })),
    ErrorBoundary: () => null,
  };
});

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));

jest.mock('../src/i18n', () => ({
  I18nProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@expo/vector-icons/FontAwesome', () => ({
  __esModule: true,
  default: {
    font: {},
  },
}));

// Font binaries are not resolvable under this Jest config, so every face the
// layout loads needs a virtual mock here. Adding a weight to `_layout.tsx`
// without adding it below fails the whole suite with MODULE_NOT_FOUND.
jest.mock('@salmon/assets/src/fonts/DMSans-Regular.ttf', () => 'DMSansRegular', { virtual: true });
jest.mock('@salmon/assets/src/fonts/DMSans-Medium.ttf', () => 'DMSansMedium', { virtual: true });
jest.mock('@salmon/assets/src/fonts/DMSans-SemiBold.ttf', () => 'DMSansSemiBold', {
  virtual: true,
});
jest.mock('@salmon/assets/src/fonts/DMSans-Bold.ttf', () => 'DMSansBold', { virtual: true });
jest.mock('@salmon/assets/src/fonts/GeistMono-Regular.ttf', () => 'GeistMonoRegular', {
  virtual: true,
});

jest.mock('../src/components/WalletInitErrorScreen', () => {
  const React = require('react');
  const { Pressable } = require('react-native');
  return {
    WalletInitErrorScreen: ({ onRetry }: { onRetry: () => void }) => (
      <Pressable testID="wallet-init-error" onPress={onRetry} />
    ),
  };
});

jest.mock('@salmon/shared', () => {
  // Declared inside the factory: `jest.mock` is hoisted above every
  // module-scope const, so a reference to one from out here is undefined by
  // the time the mocked module is first required.
  const MOCK_SEMANTIC = {
    text: { primary: '#EDF1F7', secondary: '#A7B1C4', tertiary: '#8B96AD' },
    status: { success: '#33D6A6', danger: '#FF6B85', warning: '#FFB020' },
    surface: { crest: '#1B2233' },
    border: { raised: '#6F7B95', default: '#58637B' },
    depth: { abyss: '#000' },
    accent: { ink: '#FF5C45' },
  };

  return {
    colors: {
      background: { primary: '#000' },
    },
    AccountsProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    CurrencyProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useAccountsContext: () => mockUseAccountsContext(),
    useInactivityTimeout: jest.fn(),
    createQueryClient: () => ({}),
    QueryClientProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    BridgeSettlementProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    PendingTransactionsProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    usePendingActivity: () => ({ items: [], dismiss: jest.fn() }),
    semantic: MOCK_SEMANTIC,
    // The root layout derives the navigator's palette and the status bar style
    // from the mode, so the mock has to carry the theme layer as well as the
    // tokens. Dark, which is what this file has always rendered.
    createSemantic: () => MOCK_SEMANTIC,
    ThemeProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    useTheme: () => ({ mode: 'dark', semantic: MOCK_SEMANTIC }),
    borderRadius: { lg: 16 },
    fontSize: { xs: 10, sm: 12 },
    fontWeight: { semibold: '600' },
    spacing: { xs: 4, sm: 8, md: 12 },
  };
});

describe('RootLayout mobile lock lifecycle', () => {
  let listeners: Record<string, Array<(...args: any[]) => void>>;

  beforeEach(() => {
    jest.clearAllMocks();
    listeners = {};
    mockUseAccountsContext.mockReturnValue([
      {
        ready: true,
        locked: false,
        requiredLock: true,
        accounts: [{ id: 'account-1' }],
      },
      {
        lockAccounts: mockLockAccounts,
      },
    ]);
  });

  it('only subscribes to app state changes, not Android blur events from in-app modals', async () => {
    const addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((eventType: any, listener: any) => {
        listeners[eventType] ??= [];
        listeners[eventType].push(listener);
        return { remove: jest.fn() } as any;
      });

    render(<RootLayout />);

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
    });

    expect(addEventListenerSpy).not.toHaveBeenCalledWith('blur', expect.any(Function));
  });

  it('does not lock on Android blur events triggered by in-app overlays like bottom sheets', async () => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation((eventType: any, listener: any) => {
      listeners[eventType] ??= [];
      listeners[eventType].push(listener);
      return { remove: jest.fn() } as any;
    });

    mockLockAccounts.mockResolvedValue(undefined);

    render(<RootLayout />);

    await waitFor(() => {
      expect(listeners.change).toHaveLength(1);
    });

    expect(listeners.blur).toBeUndefined();
    await Promise.resolve();

    expect(mockLockAccounts).not.toHaveBeenCalled();
  });

  it('locks on repeated active to background cycles', async () => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation((eventType: any, listener: any) => {
      listeners[eventType] ??= [];
      listeners[eventType].push(listener);
      return { remove: jest.fn() } as any;
    });

    mockLockAccounts.mockResolvedValue(undefined);

    render(<RootLayout />);

    await waitFor(() => {
      expect(listeners.change).toHaveLength(1);
    });

    listeners.change[0]('active');
    listeners.change[0]('background');
    await waitFor(() => {
      expect(mockLockAccounts).toHaveBeenCalledTimes(1);
    });

    listeners.change[0]('active');
    listeners.change[0]('background');
    await waitFor(() => {
      expect(mockLockAccounts).toHaveBeenCalledTimes(2);
    });
  });

  it('does not lock on iOS-style inactive transitions alone', async () => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation((eventType: any, listener: any) => {
      listeners[eventType] ??= [];
      listeners[eventType].push(listener);
      return { remove: jest.fn() } as any;
    });

    render(<RootLayout />);

    await waitFor(() => {
      expect(listeners.change).toHaveLength(1);
    });

    listeners.change[0]('inactive');
    await Promise.resolve();

    expect(mockLockAccounts).not.toHaveBeenCalled();
  });

  it('keeps the user on onboarding auth screens after an unlock instead of yanking to home', async () => {
    // Regression: a mid-onboarding inactivity lock used to skip the
    // analytics-consent screen (and everything after it) on unlock because
    // the screen was missing from the post-creation allowlist.
    const { router, useSegments } = require('expo-router');
    (useSegments as jest.Mock).mockReturnValue(['(auth)', 'analytics-consent']);

    render(<RootLayout />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(router.replace).not.toHaveBeenCalledWith('/(app)/(tabs)');
  });

  it('blocks with the init-error screen when init failed and no accounts loaded', async () => {
    const { router } = jest.requireMock('expo-router');
    mockUseAccountsContext.mockReturnValue([
      {
        ready: true,
        locked: false,
        requiredLock: false,
        error: 'init failed',
        accounts: [],
      },
      { lockAccounts: mockLockAccounts, retryInit: jest.fn() },
    ]);

    const { getByTestId } = render(<RootLayout />);

    expect(getByTestId('wallet-init-error')).toBeTruthy();
    // While gated, never redirect into onboarding.
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('does not block when accounts loaded despite a secondary error', async () => {
    mockUseAccountsContext.mockReturnValue([
      {
        ready: true,
        locked: false,
        requiredLock: false,
        error: 'secondary failure',
        accounts: [{ id: 'account-1' }],
      },
      { lockAccounts: mockLockAccounts, retryInit: jest.fn() },
    ]);

    const { queryByTestId } = render(<RootLayout />);

    expect(queryByTestId('wallet-init-error')).toBeNull();
  });

  it('locks when iOS eventually reaches background after becoming inactive', async () => {
    jest.spyOn(AppState, 'addEventListener').mockImplementation((eventType: any, listener: any) => {
      listeners[eventType] ??= [];
      listeners[eventType].push(listener);
      return { remove: jest.fn() } as any;
    });

    mockLockAccounts.mockResolvedValue(undefined);

    render(<RootLayout />);

    await waitFor(() => {
      expect(listeners.change).toHaveLength(1);
    });

    listeners.change[0]('inactive');
    await Promise.resolve();
    listeners.change[0]('background');
    await Promise.resolve();

    expect(mockLockAccounts).toHaveBeenCalledTimes(1);
  });
});
