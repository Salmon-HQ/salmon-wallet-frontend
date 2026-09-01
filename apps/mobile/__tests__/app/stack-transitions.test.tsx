/**
 * Every pushed screen arrives from the right — configured once, on the stack.
 *
 * The rule is a navigation contract, not a per-screen decision: Wallets,
 * Activity and each settings sub-screen slide in from the right and leave the
 * way they came, and the horizontal gesture is that motion run by hand.
 * Powerups is the one exception, and it is an exception on purpose — it rises
 * from the bottom over the Home header, as a plain screen of the same stack.
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
  DepthBackground: () => null,
  ScalesBackground: () => null,
  PowerupsFab: () => null,
}));

jest.mock('../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ floatingBottomOffset: 0 }),
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

  it('keeps Powerups the one bottom-up screen — a screen of this stack, not a modal', () => {
    render(<AppLayout />);

    expect(screensByName.powerups).toMatchObject({
      animation: 'slide_from_bottom',
      gestureDirection: 'vertical',
    });
    // No `presentation`: a modal is its own native window, and nothing —
    // neither the lock overlay nor the powerups control — can float above one.
    expect(screensByName.powerups).not.toHaveProperty('presentation');
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
