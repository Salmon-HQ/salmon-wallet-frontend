/**
 * The lock overlay used to mount inside `(tabs)/_layout.tsx`, which sits
 * BEHIND every screen pushed on the `(app)` stack — a lock landing while
 * Wallets or Activity was open left balances sitting on top of the lock.
 * It now mounts in `(app)/_layout.tsx`, a sibling of the `<Stack>` itself,
 * so it covers every screen the stack can push. Powerups used to be the one
 * exception — as a `fullScreenModal` it was its own native window and had to
 * close itself on lock. It is a plain screen of this stack now, so it is
 * covered like the rest and that effect is gone.
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
    usePathname: () => '/',
  };
});

const accountState = { locked: false };

// The derived-account scan is the shared hook's job and has its own suite; the
// shell only has to mount its provider.
jest.mock('../../src/contexts/DerivedAccountsContext', () => ({
  DerivedAccountsProvider: ({ children }: { children?: React.ReactNode }) => children,
  useDerivedAccounts: () => ({ status: { scanningAccountId: null }, rescan: jest.fn() }),
}));

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
    PowerupsFab: () => ReactActual.createElement(View, { testID: 'powerups-fab' }),
  };
});

jest.mock('../../hooks/useTabChrome', () => ({
  useTabChrome: () => ({ floatingBottomOffset: 0 }),
}));

import AppLayout from '../../app/(app)/_layout';

describe('the (app) shell', () => {
  beforeEach(() => {
    for (const key of Object.keys(screensByName)) delete screensByName[key];
    accountState.locked = false;
  });

  it('registers Wallets, Activity and Settings as pushed screens of this same layout', () => {
    render(<AppLayout />);

    expect('wallets' in screensByName).toBe(true);
    expect('activity' in screensByName).toBe(true);
    // Settings used to be a hidden tab inside `(tabs)`, which sits BELOW this
    // layout's overlay — a lock landing on a settings sub-screen left secrets
    // sitting on top of it. On this stack it is covered like anything else.
    expect('settings' in screensByName).toBe(true);
    // Powerups too: it was a `fullScreenModal` (its own native window, above
    // this whole React tree) and closed itself on lock. On this stack the
    // overlay reaches it like anything else.
    expect('powerups' in screensByName).toBe(true);
  });

  it('does not render the lock overlay while unlocked', () => {
    const { queryByTestId } = render(<AppLayout />);

    expect(queryByTestId('lock-overlay')).toBeNull();
  });

  it('renders the lock overlay as a sibling above the stack when locked, covering every pushed screen', () => {
    accountState.locked = true;
    const { getByTestId } = render(<AppLayout />);

    // Wallets, Activity and Settings are all registered on the same Stack
    // this layout owns — the overlay is a sibling of that Stack, not a child
    // of any one screen, so it sits above whichever of them is on top.
    expect('wallets' in screensByName).toBe(true);
    expect('activity' in screensByName).toBe(true);
    expect('settings' in screensByName).toBe(true);
    expect('powerups' in screensByName).toBe(true);

    const overlay = getByTestId('lock-overlay');
    const style = Object.assign({}, ...[overlay.props.style].flat(Infinity).filter(Boolean));
    expect(style.position).toBe('absolute');
    expect(style.zIndex).toBeGreaterThanOrEqual(1000);
  });
});
