/**
 * The developer flag has to reach the screens that read it.
 *
 * `DeveloperModeProvider` used to mount inside `(tabs)/_layout.tsx`. Activity,
 * Send, NFT detail and Powerups are screens pushed on the `(app)` stack, which
 * sits ABOVE the tabs layout — so every one of them read the context's default
 * `false` while storage said `true`, and the four suites that cover them
 * mocked the context and could not see it. This one does not mock the context:
 * it mounts the real `(app)` shell with the real provider and renders probes
 * where those screens go, so the only thing under test is whether the stored
 * flag actually arrives there.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';

const storedConfig = { developerNetworks: true, showUnverifiedTokens: true };

/** One probe per pushed screen, keyed by the route name the shell registers. */
const probes: Record<string, React.ComponentType> = {};

jest.mock('expo-router', () => {
  const ReactActual = require('react');
  const Screen = ({ name }: { name: string }) => {
    const Probe = probes[name];
    return Probe ? ReactActual.createElement(Probe, { key: name }) : null;
  };
  const Stack = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  Stack.Screen = Screen;
  return {
    Stack,
    useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }),
    usePathname: () => '/',
  };
});

jest.mock('../../src/contexts/DerivedAccountsContext', () => ({
  DerivedAccountsProvider: ({ children }: { children?: React.ReactNode }) => children,
  useDerivedAccounts: () => ({ status: { scanningAccountId: null }, rescan: jest.fn() }),
}));

const accountState = {
  locked: false,
  ready: true,
  activeAccount: {
    id: 'account-1',
    // Every mirror already derived, so the lazy derivation stays out of this.
    networksAccounts: {
      'solana-mainnet': [{ getReceiveAddress: () => 'Owner111' }],
      'solana-devnet': [{ getReceiveAddress: () => 'Owner222' }],
    },
  },
  activeBlockchainAccount: { getReceiveAddress: () => 'Owner111' },
  networkId: 'solana-devnet',
};

jest.mock('@salmon/shared', () => ({
  // The stored config, read once by the provider — the context itself is real.
  useUserConfig: () => ({
    developerNetworks: storedConfig.developerNetworks,
    toggleDeveloperNetworks: jest.fn(),
    showUnverifiedTokens: storedConfig.showUnverifiedTokens,
    setShowUnverifiedTokens: jest.fn(),
  }),
  MIRROR_NETWORK_IDS: { 'solana-mainnet': 'solana-devnet' },
  ensureMirrorNetworks: jest.fn(async () => []),
  useAccountsContext: () => [
    accountState,
    {
      unlockAccounts: jest.fn(),
      unlockWithCachedKey: jest.fn(),
      removeAllAccounts: jest.fn(),
      editAccount: jest.fn(),
    },
  ],
  getStashItem: jest.fn(),
}));

jest.mock('../../hooks/useBiometricAuth', () => ({
  useBiometricAuth: () => ({
    state: {},
    enableBiometric: false,
    setEnableBiometric: jest.fn(),
    authenticateWithBiometric: jest.fn(),
    storeKeyForBiometric: jest.fn(),
    refreshState: jest.fn(),
  }),
}));

jest.mock('../../src/utils/sinkAndFloat', () => ({ FLOAT_DELAY_MS: 0 }));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  useReducedMotion: () => false,
}));

jest.mock('../../src/components', () => {
  const { View } = require('react-native');
  const ReactActual = require('react');
  return {
    LockOverlay: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(View, { testID: 'lock-overlay' }, children),
    LockContent: () => ReactActual.createElement(View, { testID: 'lock-content' }),
    PowerupsFab: () => ReactActual.createElement(View, { testID: 'powerups-fab' }),
  };
});

jest.mock('../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ floatingBottomOffset: 0 }),
}));

import AppLayout from '../../app/(app)/_layout';
import { useDeveloperMode, useUnverifiedTokens } from '../../src/contexts/DeveloperModeContext';

/** A screen of the `(app)` stack, reading the flag the way the real one does. */
function probeFor(name: string) {
  return function Probe() {
    return (
      <>
        <Text testID={`${name}-developer`}>{String(useDeveloperMode())}</Text>
        <Text testID={`${name}-unverified`}>{String(useUnverifiedTokens())}</Text>
      </>
    );
  };
}

describe('the developer flag across the (app) stack', () => {
  beforeEach(() => {
    for (const key of Object.keys(probes)) delete probes[key];
    storedConfig.developerNetworks = true;
    storedConfig.showUnverifiedTokens = true;
  });

  it.each(['activity', 'send', 'nft/[id]', 'powerups'])(
    'hands the stored flag to the %s screen',
    (route) => {
      probes[route] = probeFor('probe');

      render(<AppLayout />);

      expect(screen.getByTestId('probe-developer').props.children).toBe('true');
      expect(screen.getByTestId('probe-unverified').props.children).toBe('true');
    }
  );

  it('hands the same instance to every pushed screen at once', () => {
    probes.activity = probeFor('activity');
    probes.powerups = probeFor('powerups');

    render(<AppLayout />);

    expect(screen.getByTestId('activity-developer').props.children).toBe('true');
    expect(screen.getByTestId('powerups-developer').props.children).toBe('true');
  });

  it('reads false back from storage, never a hardcoded default', () => {
    storedConfig.developerNetworks = false;
    storedConfig.showUnverifiedTokens = false;
    probes.activity = probeFor('probe');

    render(<AppLayout />);

    expect(screen.getByTestId('probe-developer').props.children).toBe('false');
    expect(screen.getByTestId('probe-unverified').props.children).toBe('false');
  });
});
