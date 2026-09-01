/**
 * Every pushed screen arrives from the right — configured once, on the stack.
 *
 * The rule is a navigation contract, not a per-screen decision: Wallets,
 * Activity and each settings sub-screen slide in from the right and leave the
 * way they came, and the horizontal gesture is that motion run by hand.
 * Powerups is the one exception, and it is an exception on purpose — it is a
 * full-height presentation that covers the Home header.
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
  return { Stack, useRouter: () => ({ replace: jest.fn() }) };
});

jest.mock('@salmon/shared', () => ({
  useAccountsContext: () => [{ locked: false }, {}],
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

jest.mock('../../src/components', () => ({
  LockOverlay: ({ children }: { children: React.ReactNode }) => children,
  LockContent: () => null,
}));

import AppLayout from '../../app/(app)/_layout';
import SettingsLayout from '../../app/(app)/(tabs)/settings/_layout';

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

  it('registers Activity as a screen of the stack, taking the stack default', () => {
    render(<AppLayout />);

    expect('activity' in screensByName).toBe(true);
    expect(screensByName.activity).toBeUndefined();
    expect(screensByName.wallets).toBeUndefined();
  });

  it('keeps Powerups the one bottom-up presentation', () => {
    render(<AppLayout />);

    expect(screensByName.powerups).toMatchObject({
      presentation: 'fullScreenModal',
      animation: 'slide_from_bottom',
      gestureDirection: 'vertical',
    });
  });

  it('gives the settings sub-stack the same right slide', () => {
    render(<SettingsLayout />);

    expect(stackOptions.animation).toBe('slide_from_right');
    expect(stackOptions.gestureDirection).toBe('horizontal');
    expect(stackOptions.headerShown).toBe(false);
  });
});
