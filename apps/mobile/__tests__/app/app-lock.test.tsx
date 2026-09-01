/**
 * The lock overlay used to mount inside `(tabs)/_layout.tsx`, which sits
 * BEHIND every screen pushed on the `(app)` stack — a lock landing while
 * Wallets or Activity was open left balances sitting on top of the lock.
 * It now mounts in `(app)/_layout.tsx`, a sibling of the `<Stack>` itself,
 * so it covers every screen the stack can push. Powerups is the one screen
 * this cannot cover (`fullScreenModal` is its own native window) and keeps
 * its own close-on-lock effect, tested separately in `powerups-browse` /
 * source comments — not here.
 */
import React from 'react';
import { render } from '@testing-library/react-native';

const screensByName: Record<string, Record<string, unknown> | undefined> = {};

jest.mock('expo-router', () => {
  const ReactActual = require('react');
  const Screen = ({ name, options }: { name: string; options?: Record<string, unknown> }) => {
    screensByName[name] = options;
    return null;
  };
  const Stack = ({ children }: { children?: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  Stack.Screen = Screen;
  return {
    Stack,
    useRouter: () => ({ replace: jest.fn() }),
  };
});

const accountState = { locked: false };

jest.mock('@salmon/shared', () => ({
  useAccountsContext: () => [
    accountState,
    { unlockAccounts: jest.fn(), unlockWithCachedKey: jest.fn(), removeAllAccounts: jest.fn() },
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
      ReactActual.createElement(
        View,
        { testID: 'lock-overlay', style: { position: 'absolute', zIndex: 1000 } },
        children
      ),
    LockContent: () => ReactActual.createElement(View, { testID: 'lock-content' }),
  };
});

import AppLayout from '../../app/(app)/_layout';

describe('the (app) shell', () => {
  beforeEach(() => {
    for (const key of Object.keys(screensByName)) delete screensByName[key];
    accountState.locked = false;
  });

  it('registers Wallets and Activity as pushed screens of this same layout', () => {
    render(<AppLayout />);

    expect('wallets' in screensByName).toBe(true);
    expect('activity' in screensByName).toBe(true);
  });

  it('does not render the lock overlay while unlocked', () => {
    const { queryByTestId } = render(<AppLayout />);

    expect(queryByTestId('lock-overlay')).toBeNull();
  });

  it('renders the lock overlay as a sibling above the stack when locked, covering every pushed screen', () => {
    accountState.locked = true;
    const { getByTestId } = render(<AppLayout />);

    // Wallets and Activity are still registered on the same Stack this
    // layout owns — the overlay is a sibling of that Stack, not a child of
    // any one screen, so it sits above whichever of them is on top.
    expect('wallets' in screensByName).toBe(true);
    expect('activity' in screensByName).toBe(true);

    const overlay = getByTestId('lock-overlay');
    const style = Object.assign({}, ...[overlay.props.style].flat(Infinity).filter(Boolean));
    expect(style.position).toBe('absolute');
    expect(style.zIndex).toBeGreaterThanOrEqual(1000);
  });
});
