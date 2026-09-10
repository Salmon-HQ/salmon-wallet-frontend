/**
 * One powerups control for two routes.
 *
 * The `+` used to be mounted twice — once by Home, once by the browse screen —
 * because Powerups was a `fullScreenModal` and nothing could float above a
 * native window. It is a plain stack screen now, so a single FAB lives above
 * the whole stack: it never unmounts between the two routes, which is what
 * makes the turn to the close mark visible WHILE the screen rises.
 *
 * What this pins: which routes show it, that `open` follows the route, which
 * way the press goes, and that it leaves with the Home content when a task
 * owns the screen.
 */
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

const mockRouter = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
const route = { pathname: '/' };
const taskChrome = { isTaskEngaged: false };

jest.mock('expo-router', () => {
  const ReactActual = require('react');
  const Stack = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  Stack.Screen = () => null;
  return { Stack, useRouter: () => mockRouter, usePathname: () => route.pathname };
});

// The derived-account scan is the shared hook's job and has its own suite; the
// shell only has to mount its provider.
jest.mock('../../src/contexts/DerivedAccountsContext', () => ({
  DerivedAccountsProvider: ({ children }: { children?: React.ReactNode }) => children,
  useDerivedAccounts: () => ({ status: { scanningAccountId: null }, rescan: jest.fn() }),
}));

jest.mock('@salmon/shared', () => ({
  // The confirmation provider and host are core's own (their own suites);
  // the layout only has to mount them.
  SignatureRequestProvider: ({ children }: { children: React.ReactNode }) => children,
  isSignableSolanaAccount: () => false,
  // The provider the layout mounts lives in shared now; its flags are faked below.
  DeveloperModeProvider: ({ children }: { children: React.ReactNode }) => children,
  useDeveloperMode: () => false,
  useUserConfig: () => ({
    developerNetworks: false,
    toggleDeveloperNetworks: jest.fn(),
    showUnverifiedTokens: false,
    setShowUnverifiedTokens: jest.fn(),
  }),
  MIRROR_NETWORK_IDS: { 'solana-mainnet': 'solana-devnet' },
  ensureMirrorNetworks: jest.fn(async () => []),
  useAccountsContext: () => [{ locked: false }, {}],
  getStashItem: jest.fn(),
}));

jest.mock('../../src/contexts/BiometricContext', () => ({
  BiometricProvider: ({ children }: { children: React.ReactNode }) => children,
  useBiometric: () => ({
    ready: true,
    available: false,
    armed: false,
    kind: null,
    arm: jest.fn(),
    unlock: jest.fn(),
    disarm: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('../../src/utils/sinkAndFloat', () => ({ FLOAT_DELAY_MS: 0 }));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  useReducedMotion: () => false,
}));

jest.mock('../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ floatingBottomOffset: 24 }),
}));

jest.mock('../../src/contexts/TaskChromeContext', () => {
  const ReactActual = require('react');
  return {
    TaskChromeProvider: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
    useTaskChrome: () => ({
      isTaskEngaged: taskChrome.isTaskEngaged,
      setTaskEngaged: jest.fn(),
      surfaceKey: 0,
    }),
  };
});

jest.mock('../../src/components', () => {
  const ReactActual = require('react');
  const { View } = require('react-native');
  return {
    LockOverlay: ({ children }: { children: React.ReactNode }) => children,
    ConfirmationHost: () => null,
    LockContent: () => null,
    PowerupsFab: ({
      open,
      onPress,
      bottomOffset,
    }: {
      open?: boolean;
      onPress: () => void;
      bottomOffset?: number;
    }) =>
      ReactActual.createElement(View, {
        testID: 'powerups-fab',
        accessibilityState: { expanded: !!open },
        onPress,
        style: { bottom: bottomOffset },
      }),
  };
});

// The Powerups entry is a build-time alias (metro.config.js); these tests
// describe the control as it behaves in a build with Powerups on, and one
// asserts the off build draws nothing.
jest.mock('../../src/powerups', () => ({ POWERUPS_ENABLED: true }));
const powerups = jest.requireMock('../../src/powerups') as { POWERUPS_ENABLED: boolean };

import AppLayout from '../../app/(app)/_layout';

describe('the powerups control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    route.pathname = '/';
    taskChrome.isTaskEngaged = false;
  });

  it('floats over Home, closed, and opens the browse screen', () => {
    const { getByTestId } = render(<AppLayout />);

    const fab = getByTestId('powerups-fab');
    expect(fab.props.accessibilityState.expanded).toBe(false);
    expect(fab.props.style.bottom).toBe(24);

    fireEvent.press(fab);
    expect(mockRouter.push).toHaveBeenCalledWith('/powerups');
  });

  it('is the SAME control on the browse screen, turned, and dismisses it', () => {
    route.pathname = '/powerups';
    const { getByTestId } = render(<AppLayout />);

    const fab = getByTestId('powerups-fab');
    expect(fab.props.accessibilityState.expanded).toBe(true);

    fireEvent.press(fab);
    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it.each(['/wallets', '/activity', '/send', '/settings', '/settings/security'])(
    'stays off %s',
    (pathname) => {
      route.pathname = pathname;
      const { queryByTestId } = render(<AppLayout />);

      expect(queryByTestId('powerups-fab')).toBeNull();
    }
  );

  it('is not mounted at all while the surface is closed', () => {
    powerups.POWERUPS_ENABLED = false;
    try {
      const { queryByTestId } = render(<AppLayout />);
      expect(queryByTestId('powerups-fab')).toBeNull();
    } finally {
      powerups.POWERUPS_ENABLED = true;
    }
  });

  it('leaves with the Home content when a task owns the screen', () => {
    taskChrome.isTaskEngaged = true;
    const { queryByTestId } = render(<AppLayout />);

    expect(queryByTestId('powerups-fab')).toBeNull();
  });
});
