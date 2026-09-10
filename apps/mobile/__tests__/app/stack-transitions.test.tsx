/**
 * Every pushed screen arrives from the right — configured once, on the stack.
 *
 * The rule is a navigation contract, not a per-screen decision: Wallets,
 * Activity and each settings sub-screen slide in from the right and leave the
 * way they came, and the horizontal gesture is that motion run by hand. A
 * Powerup is not among them: an installed one is a sub-tab of Home and its
 * catalogue is a sheet over Home, so neither has a route at all.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const screensByName: Record<string, Record<string, unknown> | undefined> = {};
let stackOptions: Record<string, unknown> = {};

jest.mock('expo-router', () => {
  const ReactActual = require('react');
  const Screen = ({ name, options }: { name: string; options?: Record<string, unknown> }) => {
    screensByName[name] = options;
    return null;
  };
  const Stack = ({
    children,
    screenOptions,
  }: {
    children?: React.ReactNode;
    screenOptions?: Record<string, unknown>;
  }) => {
    stackOptions = screenOptions ?? {};
    return ReactActual.createElement(ReactActual.Fragment, null, children);
  };
  Stack.Screen = Screen;
  return { Stack, useRouter: () => ({ replace: jest.fn() }), usePathname: () => '/' };
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
  // The providers the layout mounts live in shared now; the task chrome is the
  // real one, developer mode is pass-through (its flags are mocked below).
  ...jest.requireActual('@salmon/shared/src/contexts/TaskChromeContext'),
  DeveloperModeProvider: ({ children }: { children: React.ReactNode }) => children,
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

jest.mock('../../src/components', () => ({
  LockOverlay: ({ children }: { children: React.ReactNode }) => children,
  ConfirmationHost: () => null,
  LockContent: () => null,
  DepthBackground: () => null,
  ScalesBackground: () => null,
}));

import AppLayout from '../../app/(app)/_layout';
import SettingsLayout from '../../app/(app)/settings/_layout';

describe('the app stack', () => {
  beforeEach(() => {
    for (const key of Object.keys(screensByName)) delete screensByName[key];
    stackOptions = {};
  });

  it('pushes every screen in from the right, once, for the whole stack', () => {
    render(<AppLayout />);

    expect(stackOptions.animation).toBe('slide_from_right');
    expect(stackOptions.gestureDirection).toBe('horizontal');
    // The chrome is the app's own; a native header would double up.
    expect(stackOptions.headerShown).toBe(false);
  });

  it('registers Activity and the send flow as screens of the stack, taking the stack default', () => {
    render(<AppLayout />);

    expect('activity' in screensByName).toBe(true);
    expect(screensByName.activity).toBeUndefined();
    expect(screensByName.wallets).toBeUndefined();
    // Settings is a stack screen now, not a hidden tab: that is the whole
    // reason the gear pushes with a slide instead of cutting. No options of
    // its own — it takes the stack default like Wallets and Activity.
    expect('settings' in screensByName).toBe(true);
    expect(screensByName.settings).toBeUndefined();
    // Send is a sub-stack of its own, and it arrives from the right like any
    // other pushed screen — no options of its own on this stack.
    expect('send' in screensByName).toBe(true);
    expect(screensByName.send).toBeUndefined();
  });

  it('registers no route for a Powerup — Home carries them now', () => {
    render(<AppLayout />);

    // An installed Powerup is a sub-tab of Home and the catalogue is a sheet
    // over Home: a route for either would be a second place to reach them.
    expect('powerups' in screensByName).toBe(false);
    expect('swap' in screensByName).toBe(false);
  });

  it('gives the settings sub-stack the same right slide', () => {
    render(<SettingsLayout />);

    expect(stackOptions.animation).toBe('slide_from_right');
    expect(stackOptions.gestureDirection).toBe('horizontal');
    expect(stackOptions.headerShown).toBe(false);
  });

  it('declares no anchor on the settings sub-stack', () => {
    // An initialRouteName made pushes toward the navigator stack a fresh
    // instance showing the list instead of the tapped panel; a cold sub-route
    // gets out via the panel's replace('/settings') fallback instead.

    const layoutModule = require('../../app/(app)/settings/_layout');
    expect(layoutModule.unstable_settings).toBeUndefined();
  });
});
